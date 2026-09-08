# ==========================================================
# Dynamic ETA Forecast — PS 26028 — full pipeline
# Paste this whole file into ONE Colab cell and run it.
# Defines functions only — no execution here.
# ==========================================================
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

FEATURES = ["station_no", "sched_running_min", "dow", "month", "prev_delay"]
CAT_FEATURES = ["type_code", "station_zone"]
WEATHER_DELAY = {"clear": 0, "cloudy": 1, "rain": 3, "heavy_rain": 6, "fog": 8}
SIGNAL_DELAY = {"green": 0, "yellow": 2, "red": 5}

# ---------- 1. CLEAN ----------

def _clean_int_keys(df, cols):
    df = df.copy()
    for c in cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=cols)
    for c in cols:
        df[c] = df[c].astype(int)
    return df

def clean_delay(df):
    df = _clean_int_keys(df, ["train_no", "station_no"])
    df["date"] = pd.to_datetime(df["date"], format="mixed", errors="coerce")
    df["delay_reported"] = df["delay"].notna()
    return df

def clean_schedule(df):
    df = _clean_int_keys(df, ["train_no", "station_no"])
    for col in ["arrival_time", "departure_time"]:
        df[col] = pd.to_datetime(df[col], format="%H:%M", errors="coerce")
    return df

def clean_stations(df):
    df = df.copy()
    df["station_name"] = df["station_name"].str.strip().str.upper()
    return df

def clean_train_details(df):
    return _clean_int_keys(df, ["train_no"])

# ---------- 2. MERGE ----------

def build_master(df_delay, df_stations, df_trains, df_schedule):
    sched = clean_schedule(df_schedule)
    delay = clean_delay(df_delay)
    stations = clean_stations(df_stations)
    trains = clean_train_details(df_trains)

    sched = sched.sort_values(["train_no", "station_no"])
    sched["prev_departure"] = sched.groupby("train_no")["departure_time"].shift(1)
    sched["sched_running_min"] = (
        sched["arrival_time"] - sched["prev_departure"]
    ).dt.total_seconds() / 60

    master = sched.merge(trains, on="train_no", how="left")
    master = master.merge(
        delay[["train_no", "station_no", "station_name", "date", "delay", "delay_reported"]],
        on=["train_no", "station_no", "station_name"], how="left",
    )
    master = master.merge(
        stations[["station_name", "station_full_name", "station_zone"]],
        on="station_name", how="left",
    )
    master["dow"] = master["date"].dt.dayofweek
    master["month"] = master["date"].dt.month
    return master

# ---------- 3. TRAIN BASELINE MODEL ----------
# lag feature (prev_delay) is the strongest signal — delay propagates
# down the line. Uses LightGBM: handles millions of rows in seconds.

def train_baseline(master):
    df = master.sort_values(["train_no", "date", "station_no"]).copy()
    df["prev_delay"] = df.groupby(["train_no", "date"])["delay"].shift(1)
    df = df.dropna(subset=["delay"])
    df = df[df["delay_reported"]]

    cat_categories = {}
    for c in CAT_FEATURES:
        df[c] = df[c].astype("category")
        cat_categories[c] = df[c].cat.categories
        df[c + "_code"] = df[c].cat.codes

    df["prev_delay"] = df["prev_delay"].fillna(0)
    df["sched_running_min"] = df["sched_running_min"].fillna(df["sched_running_min"].median())

    feat_cols = FEATURES + [c + "_code" for c in CAT_FEATURES]
    X = df[feat_cols]
    y = df["delay"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = lgb.LGBMRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, n_jobs=-1, verbosity=-1)
    model.fit(X_train, y_train)
    mae = mean_absolute_error(y_test, model.predict(X_test))
    print(f"baseline MAE: {mae:.2f} min")
    return model, cat_categories

# ---------- 4. SYNTHETIC LIVE FLEET ----------
# CLEARLY LABELLED SYNTHETIC — simulates GPS/signal/congestion/weather
# for a fleet of trains "currently in transit". Swap for a real Railways
# feed once available; downstream code (build_dashboard) stays the same.

def generate_live_fleet(master, n_trains=50, seed=42):
    rng = np.random.default_rng(seed)
    trains = master["train_no"].dropna().unique()
    chosen = rng.choice(trains, size=min(n_trains, len(trains)), replace=False)
    rows = []
    for tno in chosen:
        route = master[master["train_no"] == tno].sort_values("station_no").drop_duplicates("station_no")
        if len(route) < 2:
            continue
        idx = rng.integers(0, len(route) - 1)
        current = route.iloc[idx]
        rows.append({
            "train_no": int(tno),
            "current_station_no": int(current["station_no"]),
            "speed_kmph": round(float(rng.uniform(20, 100)), 1),
            "congestion": round(float(rng.uniform(0, 1)), 2),
            "signal": rng.choice(["green", "yellow", "red"], p=[0.6, 0.3, 0.1]),
            "weather": rng.choice(["clear", "cloudy", "rain", "heavy_rain", "fog"], p=[0.45, 0.2, 0.2, 0.05, 0.1]),
            "stoppage_min": int(rng.choice([0, 0, 0, 5, 8])),
            "speed_restriction_delay": int(rng.choice([0, 0, 2, 4, 6])),
        })
    return pd.DataFrame(rows)

# ---------- 5. BUILD DASHBOARD (baseline + dynamic correction) ----------

def build_dashboard(master, model, cat_categories, live_fleet, station_map, train_names, base_time=None):
    if base_time is None:
        base_time = pd.Timestamp.now().normalize() + pd.Timedelta(hours=10)

    hist_delay = master.dropna(subset=["delay"]).groupby("train_no")["delay"].mean()
    feat_cols = FEATURES + [c + "_code" for c in CAT_FEATURES]
    results = []

    for _, row in live_fleet.iterrows():
        tno = row["train_no"]
        route = master[master["train_no"] == tno].sort_values("station_no").drop_duplicates("station_no")
        remaining_route = route[route["station_no"] > row["current_station_no"]]
        if len(remaining_route) == 0:
            continue
        destination = remaining_route.iloc[-1]
        remaining_minutes = remaining_route["sched_running_min"].sum()
        prev_delay = hist_delay.get(tno, 0)
        train_row = master[master["train_no"] == tno].iloc[0]

        pred_row = pd.DataFrame([{
            "station_no": destination["station_no"],
            "sched_running_min": destination["sched_running_min"] if pd.notna(destination["sched_running_min"]) else 0,
            "dow": base_time.dayofweek,
            "month": base_time.month,
            "prev_delay": prev_delay,
            "type_code": train_row["type_code"],
            "station_zone": train_row["station_zone"],
        }])
        for c in CAT_FEATURES:
            pred_row[c + "_code"] = pd.Categorical(pred_row[c], categories=cat_categories[c]).codes

        baseline_delay = float(model.predict(pred_row[feat_cols])[0])

        signal_delay = SIGNAL_DELAY[row["signal"]]
        congestion_delay = row["congestion"] * 4
        weather_delay = WEATHER_DELAY[row["weather"]]
        dynamic_adjustment = signal_delay + congestion_delay + row["stoppage_min"] + row["speed_restriction_delay"] + weather_delay
        adjusted_delay = max(baseline_delay + dynamic_adjustment, -5)
        eta = base_time + pd.Timedelta(minutes=float(remaining_minutes) + adjusted_delay)

        cur_row = master[(master["train_no"] == tno) & (master["station_no"] == row["current_station_no"])]
        cur_code = cur_row["station_name"].iloc[0] if len(cur_row) else "?"
        dest_code = destination["station_name"]

        results.append({
            "train_no": tno,
            "train_name": train_names.get(tno, "Unknown"),
            "type_code": train_row["type_code"],
            "current_station_code": cur_code,
            "current_station_name": station_map.get(cur_code, cur_code),
            "destination_station_code": dest_code,
            "destination_station_name": station_map.get(dest_code, dest_code),
            "speed_kmph": row["speed_kmph"],
            "signal": row["signal"],
            "congestion": row["congestion"],
            "weather": row["weather"],
            "stoppage_min": row["stoppage_min"],
            "speed_restriction_delay": row["speed_restriction_delay"],
            "weather_delay": weather_delay,
            "baseline_delay": round(baseline_delay, 2),
            "dynamic_adjustment": round(dynamic_adjustment, 2),
            "adjusted_delay": round(adjusted_delay, 2),
            "remaining_minutes": round(float(remaining_minutes), 2),
            "eta": eta.strftime("%d %b %Y, %H:%M"),
        })
    return pd.DataFrame(results)

# ---------- 6. ONE-CALL RUNNER ----------
# call this after loading the 4 CSVs — does everything end to end

def run_full_pipeline(df_combined_delay, df_station_full_names, df_train_details, df_combined_schedule, n_trains=50):
    print("building master table...")
    master = build_master(df_combined_delay, df_station_full_names, df_train_details, df_combined_schedule)

    print("training baseline model...")
    model, cat_categories = train_baseline(master)

    print("generating synthetic live fleet...")
    live_fleet = generate_live_fleet(master, n_trains=n_trains)

    station_map = dict(zip(
        df_station_full_names["station_name"].str.strip().str.upper(),
        df_station_full_names["station_full_name"],
    ))
    train_names = dict(zip(df_train_details["train_no"], df_train_details["train_name"]))

    print("building dashboard...")
    dashboard = build_dashboard(master, model, cat_categories, live_fleet, station_map, train_names)

    dashboard.to_csv("dynamic_eta_dashboard.csv", index=False)
    import joblib
    joblib.dump({"model": model, "cat_categories": cat_categories}, "eta_model.pkl")

    print(f"done. dashboard rows: {len(dashboard)}")
    return master, model, cat_categories, dashboard

# ==========================================================
# VECTORIZED versions — for full fleet (thousands of trains).
# Same logic as generate_live_fleet / build_dashboard, but batched
# instead of looping + calling model.predict() per train.
# ==========================================================

def generate_live_fleet_fast(master, n_trains=None, seed=42):
    routes = master[["train_no", "station_no"]].drop_duplicates().sort_values(["train_no", "station_no"])
    routes["rank"] = routes.groupby("train_no").cumcount()
    routes["total"] = routes.groupby("train_no")["station_no"].transform("count")
    valid = routes[routes["rank"] < routes["total"] - 1]  # exclude last stop (can't be "current" if it's the end)

    if n_trains is not None:
        chosen_trains = valid["train_no"].drop_duplicates().sample(
            n=min(n_trains, valid["train_no"].nunique()), random_state=seed
        )
        valid = valid[valid["train_no"].isin(chosen_trains)]

    sampled = valid.groupby("train_no").sample(n=1, random_state=seed).reset_index(drop=True)
    n = len(sampled)

    rng = np.random.default_rng(seed)
    fleet = pd.DataFrame({
        "train_no": sampled["train_no"].values,
        "current_station_no": sampled["station_no"].values,
        "speed_kmph": np.round(rng.uniform(20, 100, n), 1),
        "congestion": np.round(rng.uniform(0, 1, n), 2),
        "signal": rng.choice(["green", "yellow", "red"], size=n, p=[0.6, 0.3, 0.1]),
        "weather": rng.choice(["clear", "cloudy", "rain", "heavy_rain", "fog"], size=n, p=[0.45, 0.2, 0.2, 0.05, 0.1]),
        "stoppage_min": rng.choice([0, 0, 0, 5, 8], size=n),
        "speed_restriction_delay": rng.choice([0, 0, 2, 4, 6], size=n),
    })
    return fleet


def build_dashboard_fast(master, model, cat_categories, live_fleet, station_map, train_names, base_time=None):
    if base_time is None:
        base_time = pd.Timestamp.now().normalize() + pd.Timedelta(hours=10)

    route = master[["train_no", "station_no", "sched_running_min", "station_name"]].drop_duplicates(
        ["train_no", "station_no"]
    ).sort_values(["train_no", "station_no"]).copy()
    route["sched_running_min"] = route["sched_running_min"].fillna(0)

    # remaining time AFTER each station = sum of every later leg's running time
    route["suffix_sum"] = route[::-1].groupby("train_no")["sched_running_min"].cumsum()[::-1]
    route["remaining_after"] = route["suffix_sum"] - route["sched_running_min"]

    destination = route.sort_values("station_no").groupby("train_no").last().reset_index()
    destination = destination.rename(columns={
        "station_no": "dest_station_no", "sched_running_min": "dest_sched_running_min",
        "station_name": "dest_station_code",
    })[["train_no", "dest_station_no", "dest_sched_running_min", "dest_station_code"]]

    train_info = master[["train_no", "type_code", "station_zone"]].drop_duplicates("train_no")
    hist_delay = master.dropna(subset=["delay"]).groupby("train_no")["delay"].mean().rename("prev_delay")

    df = live_fleet.merge(
        route[["train_no", "station_no", "remaining_after", "station_name"]],
        left_on=["train_no", "current_station_no"], right_on=["train_no", "station_no"], how="left",
    ).rename(columns={"station_name": "current_station_code"})
    df = df.merge(destination, on="train_no", how="left")
    df = df.merge(train_info, on="train_no", how="left")
    df = df.merge(hist_delay, on="train_no", how="left")
    df["prev_delay"] = df["prev_delay"].fillna(0)

    df["dow"] = base_time.dayofweek
    df["month"] = base_time.month
    df["station_no"] = df["dest_station_no"]
    df["sched_running_min"] = df["dest_sched_running_min"]

    for c in CAT_FEATURES:
        df[c + "_code"] = pd.Categorical(df[c], categories=cat_categories[c]).codes

    feat_cols = FEATURES + [c + "_code" for c in CAT_FEATURES]
    df["baseline_delay"] = model.predict(df[feat_cols])

    signal_delay_map = {"green": 0, "yellow": 2, "red": 5}
    df["dynamic_adjustment"] = (
        df["signal"].map(signal_delay_map)
        + df["congestion"] * 4
        + df["stoppage_min"]
        + df["speed_restriction_delay"]
        + df["weather"].map(WEATHER_DELAY)
    )
    df["weather_delay"] = df["weather"].map(WEATHER_DELAY)
    df["adjusted_delay"] = (df["baseline_delay"] + df["dynamic_adjustment"]).clip(lower=-5).round(2)
    df["remaining_minutes"] = df["remaining_after"].round(2)
    df["eta"] = (
        base_time + pd.to_timedelta(df["remaining_minutes"] + df["adjusted_delay"], unit="m")
    ).dt.strftime("%d %b %Y, %H:%M")

    df["train_name"] = df["train_no"].map(train_names).fillna("Unknown")
    df["current_station_name"] = df["current_station_code"].map(station_map).fillna(df["current_station_code"])
    df["destination_station_code"] = df["dest_station_code"]
    df["destination_station_name"] = df["destination_station_code"].map(station_map).fillna(df["destination_station_code"])
    df["baseline_delay"] = df["baseline_delay"].round(2)
    df["dynamic_adjustment"] = df["dynamic_adjustment"].round(2)

    out_cols = [
        "train_no", "train_name", "type_code", "current_station_code", "current_station_name",
        "destination_station_code", "destination_station_name", "speed_kmph", "signal", "congestion",
        "weather", "stoppage_min", "speed_restriction_delay", "weather_delay", "baseline_delay",
        "dynamic_adjustment", "adjusted_delay", "remaining_minutes", "eta",
    ]
    return df[out_cols]


def run_full_pipeline_fast(df_combined_delay, df_station_full_names, df_train_details, df_combined_schedule, n_trains=None):
    print("building master table...")
    master = build_master(df_combined_delay, df_station_full_names, df_train_details, df_combined_schedule)
    print("training baseline model...")
    model, cat_categories = train_baseline(master)
    print(f"generating synthetic live fleet ({'all' if n_trains is None else n_trains} trains)...")
    live_fleet = generate_live_fleet_fast(master, n_trains=n_trains)
    station_map = dict(zip(
        df_station_full_names["station_name"].str.strip().str.upper(),
        df_station_full_names["station_full_name"],
    ))
    train_names = dict(zip(df_train_details["train_no"], df_train_details["train_name"]))
    print("building dashboard (vectorized)...")
    dashboard = build_dashboard_fast(master, model, cat_categories, live_fleet, station_map, train_names)
    dashboard.to_csv("dynamic_eta_dashboard.csv", index=False)
    import joblib
    joblib.dump({"model": model, "cat_categories": cat_categories}, "eta_model.pkl")
    print(f"done. dashboard rows: {len(dashboard)}")
    return master, model, cat_categories, dashboard
