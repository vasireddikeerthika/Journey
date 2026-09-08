import streamlit as st
import pandas as pd
import numpy as np
import time
from streamlit_autorefresh import st_autorefresh

st.set_page_config(page_title="Dynamic Railway ETA", page_icon="🚆", layout="wide")

# ---- smooth auto-refresh every 10s (no full page reload/blank flash) ----
st_autorefresh(interval=10000, key="refresh")

# ---- styling (explicit colors so it's readable in both light & dark theme) ----
st.markdown("""
<style>
    .main .block-container {padding-top: 2rem; max-width: 1200px;}
    div[data-testid="stMetric"] {
        background: #ffffff !important; border: 1px solid #e6e8eb; border-radius: 10px;
        padding: 14px 16px;
    }
    div[data-testid="stMetricLabel"] p {font-size: 13px !important; color: #6b7280 !important;}
    div[data-testid="stMetricValue"] {color: #111827 !important;}
    .signal-badge {
        display: inline-block; padding: 4px 14px; border-radius: 20px;
        font-weight: 600; font-size: 13px; letter-spacing: 0.5px;
    }
    .signal-green {background: #dcfce7; color: #166534 !important;}
    .signal-yellow {background: #fef9c3; color: #854d0e !important;}
    .signal-red {background: #fee2e2; color: #991b1b !important;}
    .section-card {
        background: #ffffff !important; border: 1px solid #ececec; border-radius: 12px;
        padding: 18px 20px; height: 100%;
    }
    .section-title {font-weight: 600 !important; font-size: 15px !important; margin-bottom: 10px !important; color: #111827 !important;}
    .info-row {display: flex; justify-content: space-between; padding: 4px 0;}
    .info-label {color: #6b7280 !important; font-size: 14px !important;}
    .info-value {font-weight: 500 !important; color: #111827 !important; font-size: 14px !important;}
</style>
""", unsafe_allow_html=True)

st.title("🚆 Dynamic Railway ETA Dashboard")
st.caption("AI-powered dynamic ETA prototype  •  🟢 Live simulation — updates every 10 seconds")

df = pd.read_csv("dynamic_eta_dashboard.csv")

# ---- jitter live values each refresh ----
seed = int(time.time() // 10)
rng = np.random.default_rng(seed)

df["speed_kmph"] = (df["speed_kmph"] + rng.normal(0, 3, len(df))).clip(20, 120).round(1)
df["congestion"] = (df["congestion"] + rng.normal(0, 0.05, len(df))).clip(0, 1).round(2)
df["signal"] = rng.choice(["green", "yellow", "red"], size=len(df), p=[0.6, 0.3, 0.1])

signal_delay_map = {"green": 0, "yellow": 2, "red": 5}
df["dynamic_adjustment"] = (
    df["signal"].map(signal_delay_map)
    + df["congestion"] * 4
    + df["stoppage_min"]
    + df["speed_restriction_delay"]
    + df["weather_delay"]
)
df["adjusted_delay"] = (df["baseline_delay"] + df["dynamic_adjustment"]).clip(lower=-5).round(2)

base_time = pd.Timestamp.now().normalize() + pd.Timedelta(hours=10)
df["eta"] = (
    base_time + pd.to_timedelta(df["remaining_minutes"] + df["adjusted_delay"], unit="m")
).dt.strftime("%d %b %Y, %H:%M")

# ---- single searchable selector (type to filter, built into the dropdown) ----
df["_label"] = df["train_no"].astype(str) + " — " + df["train_name"]
label_to_no = dict(zip(df["_label"], df["train_no"]))

selected_label = st.selectbox("🔎 Search or select a train", df["_label"].tolist())
train_no = label_to_no[selected_label]
train = df[df["train_no"] == train_no].iloc[0]

st.subheader(f'{train["train_name"]} — {train["train_no"]}')
st.caption(f'Train Type: {train["type_code"]}')

col1, col2, col3, col4 = st.columns(4)
col1.metric("Predicted ETA", train["eta"])
col2.metric("Dynamic Delay", f'{train["adjusted_delay"]:.2f} min')
col3.metric("Current Speed", f'{train["speed_kmph"]:.0f} km/h')

signal_class = f'signal-{train["signal"]}'
with col4:
    st.markdown('<div style="font-size:13px;color:#6b7280;">Signal</div>', unsafe_allow_html=True)
    st.markdown(f'<span class="signal-badge {signal_class}">{train["signal"].upper()}</span>', unsafe_allow_html=True)

st.write("")
col1, col2, col3 = st.columns(3)

remaining = int(train["remaining_minutes"])
h, m = remaining // 60, remaining % 60
remaining_display = f"{h}h {m}m" if h else f"{m}m"

with col1:
    st.markdown(f"""
    <div class="section-card">
        <div class="section-title">📍 Journey</div>
        <div class="info-row"><span class="info-label">Current Station</span><span class="info-value">{train["current_station_name"]} ({train["current_station_code"]})</span></div>
        <div class="info-row"><span class="info-label">Destination</span><span class="info-value">{train["destination_station_name"]} ({train["destination_station_code"]})</span></div>
        <div class="info-row"><span class="info-label">Remaining Time</span><span class="info-value">{remaining_display}</span></div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown(f"""
    <div class="section-card">
        <div class="section-title">🚦 Live Conditions</div>
        <div class="info-row"><span class="info-label">Signal</span><span class="info-value">{train["signal"].upper()}</span></div>
        <div class="info-row"><span class="info-label">Congestion</span><span class="info-value">{train["congestion"]:.2f}</span></div>
        <div class="info-row"><span class="info-label">Weather</span><span class="info-value">{train["weather"]}</span></div>
        <div class="info-row"><span class="info-label">Speed</span><span class="info-value">{train["speed_kmph"]:.1f} km/h</span></div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown(f"""
    <div class="section-card">
        <div class="section-title">⚠️ Delay Factors</div>
        <div class="info-row"><span class="info-label">Total Live Adjustment</span><span class="info-value">{train["dynamic_adjustment"]:.2f} min</span></div>
        <div class="info-row"><span class="info-label">Stoppage</span><span class="info-value">{train["stoppage_min"]:.2f} min</span></div>
        <div class="info-row"><span class="info-label">Speed Restriction</span><span class="info-value">{train["speed_restriction_delay"]:.2f} min</span></div>
        <div class="info-row"><span class="info-label">Weather</span><span class="info-value">{train["weather_delay"]:.2f} min</span></div>
    </div>
    """, unsafe_allow_html=True)

st.write("")
st.divider()
st.subheader("🚆 All Active Trains")
display_columns = [
    "train_no", "train_name", "type_code", "current_station_name",
    "destination_station_name", "speed_kmph", "signal", "congestion",
    "weather", "adjusted_delay", "eta",
]
st.dataframe(df[display_columns], use_container_width=True, hide_index=True)
