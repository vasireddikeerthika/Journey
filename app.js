/**
 * JOURNEY - Intelligent Railway Tracking
 * Passenger-Friendly Live Train Tracker
 * Real-Time Supabase Database Integration (.env.local)
 * Rich Authentic Railway Burgundy Palette: #8e1b29, #5a121a, #fdf2f3
 */

// 1. Supabase environment variables from .env.local
const NEXT_PUBLIC_SUPABASE_URL = 
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof window !== 'undefined' && (window.process?.env?.NEXT_PUBLIC_SUPABASE_URL || window.ENV?.NEXT_PUBLIC_SUPABASE_URL)) ||
    'https://wbhhpheqzruniikhajfz.supabase.co';

const NEXT_PUBLIC_SUPABASE_ANON_KEY = 
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof window !== 'undefined' && (window.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaGhwaGVxenJ1bmlpa2hhamZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MDA2ODEsImV4cCI6MjEwMzk3NjY4MX0.40LDIU7H5-bgrvCFYdbTEG0_yjmjQKpnle_5hUSuN3g';

// 2. Supabase client initialization (safely avoid global identifier conflict with window.supabase library)
let supabaseClient = null;
if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
}

// 3. Temporary diagnostic check right after client creation (prints whether defined at runtime, not secret values)
console.log(
    `[Supabase Client Runtime Check]:\n` +
    `  • NEXT_PUBLIC_SUPABASE_URL defined: ${typeof NEXT_PUBLIC_SUPABASE_URL !== 'undefined' && NEXT_PUBLIC_SUPABASE_URL !== ''}\n` +
    `  • NEXT_PUBLIC_SUPABASE_ANON_KEY defined: ${typeof NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'undefined' && NEXT_PUBLIC_SUPABASE_ANON_KEY !== ''}\n` +
    `  • supabaseClient created: ${typeof supabaseClient !== 'undefined' && supabaseClient !== null}`
);

// Automatic test query to verify live_trains table access
if (supabaseClient && typeof supabaseClient.from === 'function') {
    supabaseClient.from('live_trains').select('train_no,train_name,speed_kmph,signal,adjusted_delay').limit(1)
        .then(({ data, error, status }) => {
            if (error) {
                console.error('[Supabase Query Error]:', error);
            } else if (data && data.length > 0) {
                console.log(`[Supabase Live Query Success] HTTP ${status} OK - Train #${data[0].train_no} (${data[0].train_name}) loaded.`);
            }
        })
        .catch(err => console.warn('[Supabase Notice]:', err));
}

// Config reference for query helpers
const SUPABASE_CONFIG = {
    url: NEXT_PUBLIC_SUPABASE_URL,
    anonKey: NEXT_PUBLIC_SUPABASE_ANON_KEY,
    client: supabaseClient
};

// SVG Train Icon: Simple line-icon style, no background circle
const TRAIN_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">
    <rect x="4" y="3" width="16" height="16" rx="2" />
    <path d="M4 11h16" />
    <path d="M12 3v8" />
    <path d="m8 19-2 3" />
    <path d="m18 22-2-3" />
    <circle cx="8" cy="15" r="1" fill="currentColor" />
    <circle cx="16" cy="15" r="1" fill="currentColor" />
</svg>`;

// Low-latency Supabase REST query helper
async function supabaseFetch(endpoint) {
    const t0 = performance.now();
    const fullUrl = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
    
    try {
        const res = await fetch(fullUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Accept': 'application/json'
            }
        });
        
        const latencyMs = Math.round(performance.now() - t0);
        updateConnectionStatus(true, latencyMs);

        if (!res.ok) {
            throw new Error(`Supabase request failed: ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.warn('Supabase fetch fallback:', err);
        updateConnectionStatus(false);
        throw err;
    }
}

function updateConnectionStatus(isConnected, latencyMs = 24) {
    const statusEl = document.getElementById('supabaseStatus');
    const latencyEl = document.getElementById('pollLatency');
    const headerStatus = document.getElementById('headerDbStatus');
    
    const countNum = state.totalTrainsInDb ? state.totalTrainsInDb.toLocaleString() : '8,673';
    
    if (statusEl) {
        if (isConnected) {
            statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>${t('live_net_conn')} (${countNum})</span>`;
            statusEl.className = 'flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold';
        } else {
            statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>SYNCING RADAR...</span>`;
            statusEl.className = 'flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold';
        }
    }
    if (headerStatus) {
        if (isConnected) {
            headerStatus.innerText = t('trains_live').replace('{n}', countNum);
        } else {
            headerStatus.innerText = t('connecting');
        }
    }
    if (latencyEl) {
        latencyEl.innerText = `${latencyMs}ms`;
    }
}

async function fetchSupabaseStats() {
    try {
        const fullUrl = `${SUPABASE_CONFIG.url}/rest/v1/live_trains?select=train_no&limit=1`;
        const res = await fetch(fullUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Prefer': 'count=exact'
            }
        });
        const cr = res.headers.get('content-range');
        if (cr && cr.includes('/')) {
            const count = parseInt(cr.split('/')[1], 10);
            if (!isNaN(count)) {
                state.totalTrainsInDb = count;
                updateConnectionStatus(true);
                const modalCount = document.getElementById('modalTotalTrains');
                if (modalCount) modalCount.innerText = `${count.toLocaleString()} Active Trains`;
                const schedSub = document.getElementById('scheduleDbSub');
                if (schedSub) schedSub.innerText = `Browse real-time schedules and running status for ${count.toLocaleString()} trains across Indian Railways.`;
            }
        }
    } catch (e) {
        console.warn('Could not fetch Supabase train count:', e);
    }
}

// Comprehensive Multilingual Translations Dictionary
const TRANSLATIONS = {
    en: {
        // App Core
        core_title: "JOURNEY",
        core_label: "Train Running Status",
        live_feed: "LIVE UPDATES ACTIVE",
        btn_sync: "Refresh",
        welcome_guide: "How It Works",
        last_updated: "Last updated",
        trains_live: "{n} Trains Live",
        connecting: "Connecting...",

        // Navigation
        nav_title: "Navigation",
        nav_spot: "Spot Your Train",
        nav_schedule: "Train Schedule",
        nav_station: "Station to Station",
        nav_recent: "Recently Viewed",

        // How It Works Modal
        dispatch_label: "Live Railway Tracker",
        how_works_title: "How Journey App Works",
        how_works_sub: "Live GPS tracking, platform updates & delay forecasts in 4 easy steps",
        step1_title: "1. Search Any Train",
        step1_desc: "Enter a 5-digit train number (e.g. 12841) or name to find instant live details.",
        step2_title: "2. Live Satellite Radar",
        step2_desc: "View real-time train movement, cruising speed, and track signal clearance.",
        step3_title: "3. Timetable & Platforms",
        step3_desc: "See expected station arrival times, platform numbers, and live delay forecasts.",
        step4_title: "4. Station Routes",
        step4_desc: "Discover all direct trains connecting your origin and destination stations.",
        btn_got_it: "Got It, Start Tracking",
        btn_dismiss: "Don't show on startup",

        // Sidebar & Badges
        live_gps_connected: "Live GPS Connected",
        status_active: "Active",
        live_network: "Live Network",
        live_gps: "Live GPS",

        // Settings / Accessibility Menu
        accessibility_settings: "Display & Language",
        language: "Language",
        theme_label: "Theme",
        theme_light: "Light",
        theme_dark: "Dark",
        time_format: "Time Format",

        // Spot Your Train Tab
        spot_sub: "Live Train Movement & Platform Updates",
        spot_desc: "Track where your train is right now, check expected arrival times, platform numbers, and delays.",
        search_placeholder: "Enter Train No. or Name (e.g. 12841, Coromandel Express)...",
        registry_matches: "Matching Trains",
        suggested_label: "Popular & Frequent Trains",
        browse_all_trains: "Browse all 8,673 trains",
        popular_trains: "POPULAR & FREQUENT TRAINS",
        matching_trains_for: "MATCHING TRAINS FOR \"{q}\"",
        no_train_found: "No matching train found for \"{q}\". Try searching by train number or name.",

        // Train Detail View
        live_journey_title: "Live Journey Route & Timings",
        th_station: "Station",
        th_distance: "Distance",
        th_timing: "Timing",
        th_status: "Live Status",
        train_is_here: "TRAIN IS CURRENTLY HERE",
        running_late: "Running {d} mins late",
        running_ontime: "Running on time",
        ontime: "On time",
        moving_at: "Moving at {s} km/h",
        final_dest: "Final Destination",
        total_distance: "{d} km total distance",
        expected_late: "Expected ~{d}m late",
        on_schedule: "On schedule",
        live_tracking_badge: "LIVE GPS TRACKING",
        est_arrival: "Estimated Arrival",
        at_station: "At {s}",
        current_delay: "Current Delay",
        running_late_status: "Running late",
        current_speed: "Current Speed",
        journey_progress: "Journey Progress",
        completed: "Completed",
        now_at: "Now at {s}",
        track_signal: "Track Signal",
        route_weather: "Route Weather",
        delay_min: "+{d} min",
        delay_zero: "0 min",
        expected_dest: "Expected at Destination",
        reaching_by: "Reaching by {t}",
        btn_share: "Share Live Status on WhatsApp",

        // Signal descriptions
        signal_green: "Green (Track Clear Ahead)",
        signal_amber: "Amber (Caution Ahead)",
        signal_red: "Red (Signal Halt / Standby)",

        // Weather descriptions
        weather_clear: "Clear Sky • Ideal Conditions",
        weather_cloudy: "Cloudy • Pleasant Traveling",
        weather_fog: "Fog • Controlled Speeds",
        weather_rain: "Rain • Safe Transit",

        // Schedule Tab
        schedule_title: "Train Schedule & Timetable",
        schedule_sub: "Browse real-time schedules and running status for {n} trains across Indian Railways.",
        filter_trains: "Filter by train no or name...",
        current_position: "Current Position",
        status_delay: "Status / Delay",
        load_more: "Load Next 30 Trains",

        // Station to Station Tab
        find_trains: "Find Trains Between Stations",
        find_sub: "Enter your origin and destination station codes or names to see available trains.",
        from_station: "From Station",
        from_placeholder: "Origin station (e.g. SHM, NDLS)...",
        to_station: "To Station",
        to_placeholder: "Destination station (e.g. MAS, BSB)...",
        btn_find: "Find Trains",
        departs: "Departs",
        arrives: "Arrives",
        searching_routes: "Searching live routes connecting {f} and {t}...",
        no_direct_trains: "No direct trains found between {f} and {t}",
        check_stations: "Please check station codes (e.g. HWH for Howrah, MAS for Chennai, NDLS for Delhi) and try again.",

        // Recently Viewed Tab
        recent_title: "Recently Viewed Trains",
        recent_sub: "Quickly access trains you checked earlier.",
        clear_all: "Clear All",
        no_history: "No recent activity found.",

        // Additional Dynamic Labels
        departed_ontime: "Departed on time",
        current_loc: "Current Location",
        late_short: "late",
        forecast_ontime: "The train is running strictly on schedule with optimal green signal clearances. Smooth on-time arrival expected.",
        forecast_minor: "Minor delay of {d} minutes due to routine section clearance. The loco pilot is making steady progress at {s} km/h to recover time.",
        forecast_major: "Currently running {d} minutes behind schedule following track speed restrictions near {stn}. Track clearance ahead is expected to make up time.",

        // Sharing & Modal
        copy_link: "Copy Shareable Link",
        link_copied: "✓ Link Copied to Clipboard!",
        share_app: "Share Link",
        share_modal_title: "Share Live Journey",
        share_modal_subtitle: "Public link to track this train in real-time",
        currently_tracking: "Tracking Train",
        share_public_url_label: "Shareable Link",
        popular_train_links: "Quick Train Links",
        copy: "Copy",

        // Footer
        latency: "UPDATE SPEED:",
        stream: "GPS RADAR:",
        connected: "CONNECTED",
        live_net_conn: "LIVE NETWORK CONNECTED"
    },
    hi: {
        // App Core
        core_title: "जर्नी",
        core_label: "ट्रेन रनिंग स्टेटस",
        live_feed: "लाइव अपडेट सक्रिय",
        btn_sync: "ताज़ा करें",
        welcome_guide: "यह कैसे काम करता है",
        last_updated: "अंतिम अपडेट",
        trains_live: "{n} ट्रेनें लाइव",
        connecting: "कनेक्ट हो रहा है...",

        // Navigation
        nav_title: "नेविगेशन",
        nav_spot: "ट्रेन खोजें",
        nav_schedule: "ट्रेन समय सारिणी",
        nav_station: "स्टेशन से स्टेशन",
        nav_recent: "हाल ही में देखी गई",

        // How It Works Modal
        dispatch_label: "लाइव रेलवे ट्रैकर",
        how_works_title: "जर्नी ऐप कैसे काम करता है",
        how_works_sub: "4 आसान चरणों में लाइव जीपीएस ट्रैकिंग, प्लेटफ़ॉर्म और देरी का पूर्वानुमान",
        step1_title: "1. कोई भी ट्रेन खोजें",
        step1_desc: "तत्काल लाइव जानकारी पाने के लिए 5-अंकों का ट्रेन नंबर (जैसे 12841) या नाम दर्ज करें।",
        step2_title: "2. लाइव सैटेलाइट रडार",
        step2_desc: "ट्रेन का वास्तविक आवागमन, गति और ट्रैक सिग्नल की स्थिति देखें।",
        step3_title: "3. समय सारिणी और प्लेटफ़ॉर्म",
        step3_desc: "स्टेशनों पर आगमन समय, प्लेटफ़ॉर्म नंबर और देरी का लाइव अनुमान देखें।",
        step4_title: "4. स्टेशन से स्टेशन मार्ग",
        step4_desc: "अपने प्रारंभिक और गंतव्य स्टेशनों को जोड़ने वाली सभी सीधी ट्रेनें खोजें।",
        btn_got_it: "समझ गया, ट्रैकिंग शुरू करें",
        btn_dismiss: "स्टार्टअप पर न दिखाएं",

        // Sidebar & Badges
        live_gps_connected: "लाइव जीपीएस कनेक्टेड",
        status_active: "सक्रिय",
        live_network: "लाइव नेटवर्क",
        live_gps: "लाइव जीपीएस",

        // Settings / Accessibility Menu
        accessibility_settings: "प्रदर्शन और भाषा",
        language: "भाषा",
        theme_label: "थीम",
        theme_light: "लाइट",
        theme_dark: "डार्क",
        time_format: "समय प्रारूप",

        // Spot Your Train Tab
        spot_sub: "लाइव ट्रेन आवागमन और प्लेटफ़ॉर्म अपडेट",
        spot_desc: "ट्रैक करें कि आपकी ट्रेन अभी कहां है, अपेक्षित आगमन समय, प्लेटफ़ॉर्म और देरी देखें।",
        search_placeholder: "ट्रेन नंबर या नाम दर्ज करें (जैसे 12841, कोरोमंडल एक्सप्रेस)...",
        registry_matches: "मिलती-जुलती ट्रेनें",
        suggested_label: "लोकप्रिय और लगातार चलने वाली ट्रेनें",
        browse_all_trains: "सभी 8,673 ट्रेनें देखें",
        popular_trains: "लोकप्रिय और लगातार चलने वाली ट्रेनें",
        matching_trains_for: "\"{q}\" के लिए मिलती-जुलती ट्रेनें",
        no_train_found: "\"{q}\" के लिए कोई ट्रेन नहीं मिली। ट्रेन नंबर या नाम से खोजें।",

        // Train Detail View
        live_journey_title: "लाइव यात्रा मार्ग और समय सारिणी",
        th_station: "स्टेशन",
        th_distance: "दूरी",
        th_timing: "समय",
        th_status: "लाइव स्थिति",
        train_is_here: "ट्रेन अभी यहां है",
        running_late: "{d} मिनट की देरी से चल रही है",
        running_ontime: "समय पर चल रही है",
        ontime: "समय पर",
        moving_at: "{s} किमी/घंटा की गति से",
        final_dest: "अंतिम गंतव्य",
        total_distance: "{d} किमी कुल दूरी",
        expected_late: "लगभग ~{d} मिनट देरी",
        on_schedule: "समय पर",
        live_tracking_badge: "लाइव जीपीएस ट्रैकिंग",
        est_arrival: "अनुमानित आगमन",
        at_station: "{s} पर",
        current_delay: "वर्तमान देरी",
        running_late_status: "देरी से",
        current_speed: "वर्तमान गति",
        journey_progress: "यात्रा प्रगति",
        completed: "पूर्ण",
        now_at: "अभी {s} पर",
        track_signal: "ट्रैक सिग्नल",
        route_weather: "मार्ग का मौसम",
        delay_min: "+{d} मिनट",
        delay_zero: "0 मिनट",
        expected_dest: "गंतव्य पर अपेक्षित",
        reaching_by: "{t} तक पहुंचेगी",
        btn_share: "व्हाट्सएप पर लाइव स्थिति साझा करें",

        // Signal descriptions
        signal_green: "हरा (आगे ट्रैक साफ़ है)",
        signal_amber: "पीला (आगे सावधानी)",
        signal_red: "लाल (सिग्नल हॉल्ट / प्रतीक्षा)",

        // Weather descriptions
        weather_clear: "साफ़ आसमान • अनुकूल परिस्थितियां",
        weather_cloudy: "बादल छाए हैं • सुखद यात्रा",
        weather_fog: "कोहरा • नियंत्रित गति",
        weather_rain: "बारिश • सुरक्षित पारगमन",

        // Schedule Tab
        schedule_title: "ट्रेन समय सारिणी",
        schedule_sub: "भारतीय रेल की {n} ट्रेनों के वास्तविक समय सारिणी और स्थिति देखें।",
        filter_trains: "ट्रेन नंबर या नाम से फ़िल्टर करें...",
        current_position: "वर्तमान स्थिति",
        status_delay: "स्थिति / देरी",
        load_more: "अगली 30 ट्रेनें लोड करें",

        // Station to Station Tab
        find_trains: "स्टेशनों के बीच ट्रेनें खोजें",
        find_sub: "उपलब्ध ट्रेनें देखने के लिए अपने प्रारंभिक और गंतव्य स्टेशन कोड या नाम दर्ज करें।",
        from_station: "प्रारंभिक स्टेशन",
        from_placeholder: "प्रारंभिक स्टेशन (जैसे HWH, NDLS)...",
        to_station: "गंतव्य स्टेशन",
        to_placeholder: "गंतव्य स्टेशन (जैसे MAS, BSB)...",
        btn_find: "ट्रेनें खोजें",
        departs: "प्रस्थान",
        arrives: "आगमन",
        searching_routes: "{f} और {t} के बीच लाइव रूट खोज रहे हैं...",
        no_direct_trains: "{f} और {t} के बीच कोई सीधी ट्रेन नहीं मिली",
        check_stations: "कृपया स्टेशन कोड जांचें और पुनः प्रयास करें।",

        // Recently Viewed Tab
        recent_title: "हाल ही में देखी गई ट्रेनें",
        recent_sub: "अपनी पहले खोजी गई ट्रेनों को तुरंत देखें।",
        clear_all: "सब साफ़ करें",
        no_history: "कोई हालिया गतिविधि नहीं मिली।",

        // Additional Dynamic Labels
        departed_ontime: "समय पर रवाना",
        current_loc: "वर्तमान स्थान",
        late_short: "देरी",
        forecast_ontime: "ट्रेन बिल्कुल समय पर चल रही है और आगे ग्रीन सिग्नल है। समय पर आगमन की उम्मीद है।",
        forecast_minor: "नियमित सेक्शन क्लीयरेंस के कारण {d} मिनट की मामूली देरी। लोको पायलट समय की भरपाई के लिए {s} किमी/घंटा की गति से आगे बढ़ रहे हैं।",
        forecast_major: "{stn} के पास गति प्रतिबंधों के कारण वर्तमान में {d} मिनट की देरी से चल रही है। आगे ट्रैक साफ़ होने पर समय नियंत्रित होने की उम्मीद है।",

        // Sharing & Modal
        copy_link: "शेयर करने योग्य लिंक कॉपी करें",
        link_copied: "✓ लिंक क्लिपबोर्ड पर कॉपी हो गया!",
        share_app: "शेयर लिंक",
        share_modal_title: "लाइव यात्रा साझा करें",
        share_modal_subtitle: "इस ट्रेन को वास्तविक समय में ट्रैक करने का सार्वजनिक लिंक",
        currently_tracking: "ट्रेक की जा रही ट्रेन",
        share_public_url_label: "शेयर करने योग्य लिंक",
        popular_train_links: "त्वरित ट्रेन लिंक",
        copy: "कॉपी",

        // Footer
        latency: "अपडेट गति:",
        stream: "जीपीएस रडार:",
        connected: "सक्रिय",
        live_net_conn: "लाइव नेटवर्क कनेक्टेड"
    },
    te: {
        // App Core
        core_title: "జర్నీ",
        core_label: "రైలు రన్నింగ్ స్టేటస్",
        live_feed: "లైవ్ అప్‌డేట్స్ యాక్టివ్",
        btn_sync: "రిఫ్రెష్",
        welcome_guide: "ఇది ఎలా పనిచేస్తుంది",
        last_updated: "చివరిగా అప్‌డేట్ చేసినది",
        trains_live: "{n} రైళ్లు లైవ్",
        connecting: "కనెక్ట్ అవుతోంది...",

        // Navigation
        nav_title: "నావిగేషన్",
        nav_spot: "రైలును గుర్తించండి",
        nav_schedule: "రైలు సమయ పట్టిక",
        nav_station: "స్టేషన్ నుండి స్టేషన్",
        nav_recent: "ఇటీవల చూసినవి",

        // How It Works Modal
        dispatch_label: "లైవ్ రైల్వే ట్రాకర్",
        how_works_title: "జర్నీ యాప్ ఎలా పనిచేస్తుంది",
        how_works_sub: "4 సులభమైన దశల్లో లైవ్ జీపీఎస్ ట్రాకింగ్, ప్లాట్‌ఫారమ్ అప్‌డేట్‌లు మరియు ఆలస్య వివరాలు",
        step1_title: "1. ఏదైనా రైలును శోధించండి",
        step1_desc: "తక్షణ లైవ్ వివరాలను కనుగొనడానికి 5-అంకెల రైలు సంఖ్య (ఉదా. 12841) లేదా పేరును నమోదు చేయండి.",
        step2_title: "2. లైవ్ శాటిలైట్ రడార్",
        step2_desc: "రైలు కదలిక, ప్రయాణ వేగం మరియు ట్రాక్ సిగ్నల్ స్థితిని నిజ సమయంలో చూడండి.",
        step3_title: "3. టైమ్‌టేబుల్ మరియు ప్లాట్‌ఫారమ్‌లు",
        step3_desc: "స్టేషన్ల వద్ద రాక సమయాలు, ప్లాట్‌ఫారమ్ సంఖ్యలు మరియు ఆలస్య వివరాలు చూడండి.",
        step4_title: "4. స్టేషన్ మార్గాలు",
        step4_desc: "మీ ప్రారంభ మరియు గమ్యస్థాన స్టేషన్లను కలిపే అన్ని ప్రత్యక్ష రైళ్లను కనుగొనండి.",
        btn_got_it: "అర్థమైంది, ట్రాకింగ్ ప్రారంభించండి",
        btn_dismiss: "ప్రారంభంలో చూపించవద్దు",

        // Sidebar & Badges
        live_gps_connected: "లైవ్ జీపీఎస్ కనెక్ట్ అయింది",
        status_active: "యాక్టివ్",
        live_network: "లైవ్ నెట్‌వర్క్",
        live_gps: "లైవ్ జీపీఎస్",

        // Settings / Accessibility Menu
        accessibility_settings: "డిస్ప్లే & భాష",
        language: "భాష",
        theme_label: "థీమ్",
        theme_light: "లైట్",
        theme_dark: "డార్క్",
        time_format: "సమయ ఫార్మాట్",

        // Spot Your Train Tab
        spot_sub: "లైవ్ రైలు లొకేషన్ మరియు ప్లాట్‌ఫారమ్ అప్‌డేట్‌లు",
        spot_desc: "మీ రైలు ప్రస్తుతం ఎక్కడ ఉందో ట్రాక్ చేయండి, వచ్చే సమయం, ప్లాట్‌ఫారమ్ మరియు ఆలస్యాన్ని తనిఖీ చేయండి.",
        search_placeholder: "రైలు నంబర్ లేదా పేరును నమోదు చేయండి (ఉదా. 12841, కోరమాండల్)...",
        registry_matches: "సరిపోలే రైళ్లు",
        suggested_label: "ప్రసిద్ధ మరియు తరచుగా ప్రయాణించే రైళ్లు",
        browse_all_trains: "అన్ని 8,673 రైళ్లను చూడండి",
        popular_trains: "ప్రసిద్ధ మరియు తరచుగా ప్రయాణించే రైళ్లు",
        matching_trains_for: "\"{q}\" కోసం సరిపోలే రైళ్లు",
        no_train_found: "\"{q}\" కోసం రైలు ఏదీ కనుగొనబడలేదు. రైలు సంఖ్య లేదా పేరుతో వెతకండి.",

        // Train Detail View
        live_journey_title: "లైవ్ ప్రయాణ మార్గం మరియు సమయాలు",
        th_station: "స్టేషన్",
        th_distance: "దూరం",
        th_timing: "సమయం",
        th_status: "లైవ్ స్థితి",
        train_is_here: "రైలు ప్రస్తుతం ఇక్కడ ఉంది",
        running_late: "{d} నిమిషాల ఆలస్యంగా నడుస్తోంది",
        running_ontime: "సమయానికి నడుస్తోంది",
        ontime: "సమయానికి",
        moving_at: "{s} కి.మీ/గం వేగంతో",
        final_dest: "తుది గమ్యస్థానం",
        total_distance: "{d} కి.మీ మొత్తం దూరం",
        expected_late: "సుమారు ~{d}ని ఆలస్యం",
        on_schedule: "షెడ్యూల్ ప్రకారం",
        live_tracking_badge: "లైవ్ జీపీఎస్ ట్రాకింగ్",
        est_arrival: "అంచనా రాక సమయం",
        at_station: "{s} వద్ద",
        current_delay: "ప్రస్తుత ఆలస్యం",
        running_late_status: "ఆలస్యంగా",
        current_speed: "ప్రస్తుత వేగం",
        journey_progress: "ప్రయాణ పురోగతి",
        completed: "పూర్తయింది",
        now_at: "ఇప్పుడు {s} వద్ద",
        track_signal: "ట్రాక్ సిగ్నల్",
        route_weather: "మార్గంలో వాతావరణం",
        delay_min: "+{d} నిమిషాలు",
        delay_zero: "0 నిమిషాలు",
        expected_dest: "గమ్యస్థానం వద్ద అంచనా",
        reaching_by: "{t} సమయానికి చేరుకుంటుంది",
        btn_share: "వాట్సాప్ ద్వారా షేర్ చేయండి",

        // Signal descriptions
        signal_green: "ఆకుపచ్చ (ముందుకు ట్రాక్ స్పష్టంగా ఉంది)",
        signal_amber: "అంబర్ (ముందుకు జాగ్రత్త)",
        signal_red: "ఎరుపు (సిగ్నల్ ఆగింది / వేచి ఉండండి)",

        // Weather descriptions
        weather_clear: "స్పష్టమైన ఆకాశం • అనుకూల వాతావరణం",
        weather_cloudy: "మేఘావృతం • ఆహ్లాదకరమైన ప్రయాణం",
        weather_fog: "మంచు • నియంత్రిత వేగం",
        weather_rain: "వర్షం • సురక్షిత ప్రయాణం",

        // Schedule Tab
        schedule_title: "రైలు సమయ పట్టిక",
        schedule_sub: "భారతీయ రైల్వేలోని {n} రైళ్ల రియల్-టైమ్ షెడ్యూల్‌లు మరియు స్థితిని చూడండి.",
        filter_trains: "రైలు నంబర్ లేదా పేరు ద్వారా ఫిల్టర్ చేయండి...",
        current_position: "ప్రస్తుత లొకేషన్",
        status_delay: "స్థితి / ఆలస్యం",
        load_more: "తదుపరి 30 రైళ్లను లోడ్ చేయండి",

        // Station to Station Tab
        find_trains: "స్టేషన్ల మధ్య రైళ్లను కనుగొనండి",
        find_sub: "అందుబాటులో ఉన్న రైళ్లను చూడటానికి ప్రారంభ మరియు గమ్యస్థాన స్టేషన్ కోడ్‌లు లేదా పేర్లను నమోదు చేయండి.",
        from_station: "ప్రారంభ స్టేషన్",
        from_placeholder: "ప్రారంభ స్టేషన్ (ఉదా. SC, MAS, NDLS)...",
        to_station: "గమ్యస్థాన స్టేషన్",
        to_placeholder: "చేరే స్టేషన్ (ఉదా. BZA, VSKP)...",
        btn_find: "రైళ్లను కనుగొనండి",
        departs: "బయలుదేరు సమయం",
        arrives: "చేరు సమయం",
        searching_routes: "{f} మరియు {t} మధ్య లైవ్ రూట్లను వెతుకుతున్నాము...",
        no_direct_trains: "{f} మరియు {t} మధ్య ప్రత్యక్ష రైళ్లు ఏవీ కనుగొనబడలేదు",
        check_stations: "దయచేసి స్టేషన్ కోడ్‌లను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",

        // Recently Viewed Tab
        recent_title: "ఇటీవల చూసిన రైళ్లు",
        recent_sub: "మీరు ఇంతకు ముందు చూసిన రైళ్లను త్వరగా చూడండి.",
        clear_all: "అన్నీ తొలగించండి",
        no_history: "ఇటీవలి కార్యాచరణ ఏదీ కనుగొనబడలేదు.",

        // Additional Dynamic Labels
        departed_ontime: "సమయానికి బయలుదేరింది",
        current_loc: "ప్రస్తుత ప్రదేశం",
        late_short: "ఆలస్యం",
        forecast_ontime: "రైలు ఖచ్చితమైన సమయానికి నడుస్తోంది మరియు గ్రీన్ సిగ్నల్ క్లియరెన్స్ ఉంది. సమయానికి చేరుకోవడం ఖాయం.",
        forecast_minor: "సాధారణ సెక్షన్ క్లియరెన్స్ వల్ల {d} నిమిషాల స్వల్ప ఆలస్యం. సమయాన్ని భర్తీ చేయడానికి రైలు {s} కి.మీ/గం వేగంతో ప్రయాణిస్తోంది.",
        forecast_major: "{stn} సమీపంలో వేగ పరిమితుల వల్ల ప్రస్తుతం {d} నిమిషాలు ఆలస్యంగా నడుస్తోంది. ముందుకు ట్రాక్ క్లియర్ కాగానే సమయం పూరించబడుతుంది.",

        // Sharing & Modal
        copy_link: "షేర్ లింక్‌ను కాపీ చేయండి",
        link_copied: "✓ లింక్ క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!",
        share_app: "లింక్ షేర్ చేయండి",
        share_modal_title: "ప్రత్యక్ష ప్రయాణాన్ని షేర్ చేయండి",
        share_modal_subtitle: "ఈ రైలును నిజ సమయంలో ట్రాక్ చేయడానికి పబ్లిక్ లింక్",
        currently_tracking: "ట్రాక్ చేస్తున్న రైలు",
        share_public_url_label: "షేర్ చేయగల లింక్",
        popular_train_links: "త్వరిత రైలు లింకులు",
        copy: "కాపీ",

        // Footer
        latency: "అప్‌డేట్ వేగం:",
        stream: "జీపీఎస్ రడార్:",
        connected: "కనెక్ట్ అయింది",
        live_net_conn: "లైవ్ నెట్‌వర్క్ కనెక్ట్ అయింది"
    }
};

// Translation lookup helper with fallback
function t(key, fallback = '') {
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
    if (dict && dict[key] !== undefined) return dict[key];
    if (TRANSLATIONS.en && TRANSLATIONS.en[key] !== undefined) return TRANSLATIONS.en[key];
    return fallback || key;
}

// String formatting helpers
function formatTrainName(raw) {
    if (!raw) return '';
    return raw.toUpperCase()
        .replace(/\bEXP\b/g, 'EXPRESS')
        .replace(/\bSPL\b/g, 'SPECIAL')
        .replace(/\bSHTBDI\b/g, 'SHATABDI')
        .replace(/\bSHT\b/g, 'SHATABDI')
        .replace(/\bEX\b/g, 'EXPRESS')
        .replace(/\bCOROMANDAL\b/g, 'COROMANDEL');
}

function formatStationName(raw) {
    if (!raw) return '';
    return raw.toLowerCase().split(' ').map(w => {
        if (w === 'jn') return 'Jn';
        if (w === 'trm' || w === 't') return 'Terminal';
        if (w === 'cantt') return 'Cantt';
        if (w === 'rd') return 'Road';
        if (w === 'mgr') return 'MGR';
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
}

function formatTrainType(typeCode) {
    if (!typeCode) return 'SUPERFAST';
    const clean = typeCode.replace('-TRAINS', '').toUpperCase();
    switch (clean) {
        case 'T18': return 'VANDE BHARAT';
        case 'SF': return 'SUPERFAST';
        case 'PRM': return 'PREMIUM SPECIAL';
        case 'EXP': return 'EXPRESS';
        case 'PASS': return 'PASSENGER';
        case 'RAJ': return 'RAJDHANI';
        case 'SHT': return 'SHATABDI';
        default: return clean;
    }
}

// Full Train Registry with Instant Offline Availability & Supabase Live Sync
const TRAIN_DATA = [
    {
        no: "12841",
        name: "COROMANDEL EXPRESS",
        type: "SUPERFAST",
        coaches: "22 Coaches • LHB Superfast Express",
        origin: "HWH",
        originName: "Howrah Jn",
        dest: "MAS",
        destName: "MGR Chennai Central",
        zone: "South Eastern Railway",
        delay: 17,
        speed: 82,
        maxSpeed: 130,
        eta: "10:23 PM",
        etaStation: "MGR Chennai Central",
        progressKm: 1232,
        totalKm: 1662,
        percentComplete: "74%",
        remainingTime: "Approx. 12h 06m remaining (430 km to destination)",
        signal: "green",
        weather: "clear",
        stoppageMin: 8,
        currentStationCode: "BZA",
        currentStationName: "Vijayawada Jn",
        stops: [
            { code: "HWH", name: "Howrah Jn", dist: 0, pf: "Platform 2", sched: "15:10", status: "Departed on time", onTime: true, passed: true },
            { code: "SRC", name: "Santragachi Jn", dist: 8, pf: "Platform 1", sched: "15:32", status: "Departed on time", onTime: true, passed: true },
            { code: "KGP", name: "Kharagpur Jn", dist: 116, pf: "Platform 3", sched: "17:00", status: "Departed on time", onTime: true, passed: true },
            { code: "BLS", name: "Balasore", dist: 234, pf: "Platform 2", sched: "18:20", status: "Departed on time", onTime: true, passed: true },
            { code: "BHC", name: "Bhadrakh", dist: 296, pf: "Platform 2", sched: "19:30", status: "Departed on time", onTime: true, passed: true },
            { code: "JJKR", name: "Jajpur K Road", dist: 340, pf: "Platform 3", sched: "20:13", status: "Departed on time", onTime: true, passed: true },
            { code: "CTC", name: "Cuttack", dist: 412, pf: "Platform 4", sched: "21:13", status: "Departed on time", onTime: true, passed: true },
            { code: "BBS", name: "Bhubaneswar", dist: 439, pf: "Platform 4", sched: "21:55", status: "Departed on time", onTime: true, passed: true },
            { code: "KUR", name: "Khurda Road Jn", dist: 458, pf: "Platform 3", sched: "22:10", status: "Departed on time", onTime: true, passed: true },
            { code: "BAM", name: "Brahmapur", dist: 605, pf: "Platform 2", sched: "00:05", status: "8 mins late", isDelay: true, passed: true },
            { code: "VSKP", name: "Visakhapatnam", dist: 882, pf: "Platform 1", sched: "04:40", status: "10 mins late", isDelay: true, passed: true },
            { code: "RJY", name: "Rajamundry", dist: 1083, pf: "Platform 1", sched: "07:15", status: "14 mins late", isDelay: true, passed: true },
            { code: "TDD", name: "Tadepalligudem", dist: 1125, pf: "Platform 2", sched: "08:05", status: "16 mins late", isDelay: true, passed: true },
            { code: "EE", name: "Eluru", dist: 1172, pf: "Platform 3", sched: "08:45", status: "16 mins late", isDelay: true, passed: true },
            { code: "BZA", name: "Vijayawada Jn", dist: 1232, pf: "Platform 6", sched: "Arr: 10:20", status: "Current Location", current: true, passed: false },
            { code: "MAS", name: "MGR Chennai Central", dist: 1662, pf: "Terminus", sched: "Expected: 10:23 PM", status: "Final Destination", isTerminus: true, passed: false }
        ]
    },
    {
        no: "12951",
        name: "MUMBAI RAJDHANI",
        type: "RAJDHANI",
        coaches: "20 Coaches • Premium Tejas Rajdhani",
        origin: "MMCT",
        originName: "Mumbai Central",
        dest: "NDLS",
        destName: "New Delhi",
        zone: "Western Railway",
        delay: 5,
        speed: 110,
        maxSpeed: 130,
        eta: "08:32 AM",
        etaStation: "New Delhi",
        progressKm: 263,
        totalKm: 1386,
        percentComplete: "19%",
        remainingTime: "Approx. 12h 45m remaining",
        signal: "green",
        weather: "clear",
        currentStationCode: "ST",
        currentStationName: "Surat",
        stops: [
            { code: "MMCT", name: "Mumbai Central", dist: 0, pf: "Platform 1", sched: "16:40", status: "Departed on time", onTime: true, passed: true },
            { code: "BVI", name: "Borivali", dist: 30, pf: "Platform 6", sched: "17:24", status: "Departed on time", onTime: true, passed: true },
            { code: "ST", name: "Surat", dist: 263, pf: "Platform 1", sched: "Arr: 19:48", status: "Current Location", current: true, passed: false },
            { code: "BRC", name: "Vadodara Jn", dist: 392, pf: "Platform 2", sched: "Expected: 21:15", status: "5 mins late", isDelay: true, passed: false },
            { code: "KOTA", name: "Kota Jn", dist: 920, pf: "Platform 1", sched: "Expected: 03:15", status: "On time", onTime: true, passed: false },
            { code: "NDLS", name: "New Delhi", dist: 1386, pf: "Terminus", sched: "Expected Arrival: 08:32 AM", status: "Final Destination", isTerminus: true, passed: false }
        ]
    },
    {
        no: "12002",
        name: "BHOPAL SHATABDI",
        type: "SHATABDI",
        coaches: "16 Coaches • High-Speed Chair Car",
        origin: "NDLS",
        originName: "New Delhi",
        dest: "RKMP",
        destName: "Rani Kamlapati",
        zone: "Northern Railway",
        delay: 0,
        speed: 130,
        maxSpeed: 150,
        eta: "02:40 PM",
        etaStation: "Rani Kamlapati",
        progressKm: 195,
        totalKm: 702,
        percentComplete: "28%",
        remainingTime: "Approx. 6h 45m remaining",
        signal: "green",
        weather: "clear",
        currentStationCode: "AGC",
        currentStationName: "Agra Cantt",
        stops: [
            { code: "NDLS", name: "New Delhi", dist: 0, pf: "Platform 1", sched: "06:00", status: "Departed on time", onTime: true, passed: true },
            { code: "AGC", name: "Agra Cantt", dist: 195, pf: "Platform 1", sched: "Arr: 07:50", status: "Current Location", current: true, passed: false },
            { code: "GWL", name: "Gwalior Jn", dist: 313, pf: "Platform 2", sched: "Expected: 09:23", status: "On time", onTime: true, passed: false },
            { code: "BPL", name: "Bhopal Jn", dist: 696, pf: "Platform 1", sched: "Expected: 02:15 PM", status: "On time", onTime: true, passed: false },
            { code: "RKMP", name: "Rani Kamlapati", dist: 702, pf: "Terminus", sched: "Expected Arrival: 02:40 PM", status: "Final Destination", isTerminus: true, passed: false }
        ]
    },
    {
        no: "22436",
        name: "VANDE BHARAT EXP",
        type: "VANDE BHARAT",
        coaches: "16 Coaches • Semi-High Speed Express",
        origin: "NDLS",
        originName: "New Delhi",
        dest: "BSB",
        destName: "Varanasi Jn",
        zone: "Northern Railway",
        delay: 12,
        speed: 125,
        maxSpeed: 130,
        eta: "02:00 PM",
        etaStation: "Varanasi Jn",
        progressKm: 440,
        totalKm: 759,
        percentComplete: "58%",
        remainingTime: "Approx. 3h 50m remaining",
        signal: "green",
        weather: "clear",
        currentStationCode: "CNB",
        currentStationName: "Kanpur Central",
        stops: [
            { code: "NDLS", name: "New Delhi", dist: 0, pf: "Platform 16", sched: "06:00", status: "Departed on time", onTime: true, passed: true },
            { code: "CNB", name: "Kanpur Central", dist: 440, pf: "Platform 5", sched: "Arr: 10:10", status: "Current Location", current: true, passed: false },
            { code: "PRYJ", name: "Prayagraj Jn", dist: 634, pf: "Platform 6", sched: "Expected: 12:20 PM", status: "12 mins late", isDelay: true, passed: false },
            { code: "BSB", name: "Varanasi Jn", dist: 759, pf: "Terminus", sched: "Expected Arrival: 02:00 PM", status: "Final Destination", isTerminus: true, passed: false }
        ]
    }
];

// Active Application State
const state = {
    lang: localStorage.getItem('journeyLang') || 'en',
    theme: localStorage.getItem('journeyTheme') || 'light',
    timeFormat: localStorage.getItem('journeyTimeFormat') || '24',
    currentTab: 'spot-your-train',
    history: JSON.parse(localStorage.getItem('journeyHistory') || '[]'),
    selectedTrain: null,
    suggestedTrains: [],
    totalTrainsInDb: 8673,
    scheduleOffset: 0,
    scheduleTrains: []
};

// DOM Elements
const elements = {
    overlay: document.getElementById('welcome-overlay'),
    sidebarLinks: document.querySelectorAll('.nav-link'),
    tabs: document.querySelectorAll('[data-tab-content]'),
    accessibilityBtn: document.getElementById('accessibilityBtn'),
    accessibilityDropdown: document.getElementById('accessibilityDropdown'),
    searchIn: document.getElementById('trainSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchList: document.getElementById('searchResultsList'),
    detailView: document.getElementById('trainDetailView'),
    recentList: document.getElementById('recentHistoryList'),
    historyEmpty: document.getElementById('historyEmptyState'),
    stnFrom: document.getElementById('fromStnInput'),
    stnTo: document.getElementById('toStnInput'),
    stnFromDropdown: document.getElementById('fromStnDropdown'),
    stnToDropdown: document.getElementById('toStnDropdown'),
    stnResults: document.getElementById('stnToStnResults'),
    scheduleList: document.getElementById('scheduleList'),
    scheduleSearch: document.getElementById('scheduleSearch'),
    suggestedList: document.getElementById('suggestedTrainsList'),
    headerDbStatus: document.getElementById('headerDbStatus'),
    supabaseModal: document.getElementById('supabaseDiagnosticModal'),
    supabaseModalBtn: document.getElementById('supabaseModalBtn'),
    closeSupabaseModal: document.getElementById('closeSupabaseModal'),
    closeSupabaseModalBottom: document.getElementById('btnCloseSupabaseModalBottom'),
    modalTotalTrains: document.getElementById('modalTotalTrains'),
    modalQueryOutput: document.getElementById('modalQueryOutput'),
    btnRunTestQuery: document.getElementById('btnRunTestQuery'),
    btnLoadMoreSchedule: document.getElementById('btnLoadMoreSchedule'),
    searchDropdownLabel: document.getElementById('searchDropdownLabel')
};

// App Initialization
async function init() {
    // Parse URL Query parameters for Deep-Linking & Sharable links
    let initialTrainNo = '12841';
    let initialTab = 'spot-your-train';

    if (typeof window !== 'undefined' && window.location && window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const trainParam = urlParams.get('train');
        const langParam = urlParams.get('lang');
        const tabParam = urlParams.get('tab');

        if (langParam && ['en', 'hi', 'te'].includes(langParam)) {
            state.lang = langParam;
            localStorage.setItem('journeyLang', state.lang);
        }
        if (tabParam) {
            initialTab = tabParam;
        }
        if (trainParam) {
            initialTrainNo = trainParam;
        }
    }

    applyTheme(state.theme);
    applyLanguage();
    renderLogos();
    bindEvents();
    setupSupabaseModal();
    updateAccessibilityMenuUI();
    
    // Activate target tab or default tab
    switchTab(initialTab);
    if (elements.searchIn) {
        elements.searchIn.value = '';
        updateClearBtn();
    }
    selectTrain(initialTrainNo, false);
    renderSuggestedTrains();

    updateLiveDisplays();
    setInterval(updateLiveDisplays, 1000);

    // Fetch database stats & live trains from Supabase
    fetchSupabaseStats();
    loadSuggestedTrains();
}

function renderLogos() {
    const containers = [
        ...document.querySelectorAll('.welcome-logo-container'),
        ...document.querySelectorAll('.sidebar-logo-container')
    ];
    containers.forEach(c => {
        if (!c) return;
        const img = document.createElement('img');
        img.src = 'logo.png';
        img.alt = 'Journey Logo';
        img.className = 'w-full h-full object-contain';
        img.onerror = () => {
            c.innerHTML = TRAIN_LOGO_SVG;
        };
        c.innerHTML = '';
        c.appendChild(img);
    });
    
    const sideTrain = document.getElementById('sidebar-train-img-container');
    if (sideTrain) {
        const img = document.createElement('img');
        img.src = 'train.jpg';
        img.alt = 'Journey Express';
        img.className = 'w-full h-full object-cover';
        img.onerror = () => {
            sideTrain.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-900 text-white p-2 text-center text-xs font-bold font-mono">JOURNEY EXPRESS</div>';
        };
        sideTrain.innerHTML = '';
        sideTrain.appendChild(img);
    }
}

// How It Works / Process Guide Modal Controls
function openWelcomeModal() {
    const overlay = document.getElementById('welcome-overlay');
    if (!overlay) return;
    document.documentElement.classList.remove('hide-welcome-initially');
    overlay.classList.remove('hidden');
    overlay.classList.remove('forced-show');
}

function closeWelcomeModal(dontShowAgain = false) {
    const overlay = document.getElementById('welcome-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('forced-show');
    if (dontShowAgain) {
        localStorage.setItem('journeyWelcomeCompleted', 'true');
        document.documentElement.classList.add('hide-welcome-initially');
    }
}

// Public Shareable URL Generator (supports Cloudflare public tunnel and localhost)
function getPublicShareUrl(trainNo) {
    let base = window.PUBLIC_TUNNEL_URL || window.location.origin;
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        base = window.location.origin;
    }
    const currentPath = window.location.pathname.endsWith('.html') ? window.location.pathname : '/';
    const u = new URL(currentPath, base);
    const no = trainNo || (state.selectedTrain ? state.selectedTrain.no : '12841');
    if (no) u.searchParams.set('train', no);
    if (state.lang && state.lang !== 'en') u.searchParams.set('lang', state.lang);
    if (state.activeTab && state.activeTab !== 'overview') u.searchParams.set('tab', state.activeTab);
    return u.toString();
}

// Floating Toast Notification
function showShareToast(message) {
    let toast = document.getElementById('journey-share-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'journey-share-toast';
        toast.className = 'fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 bg-neutral-900/95 dark:bg-[#181e29]/95 text-white text-xs font-semibold rounded-xl shadow-2xl border border-neutral-700/50 backdrop-blur-md transition-all duration-300 transform translate-y-12 opacity-0 pointer-events-none';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span> <span>${message}</span>`;
    toast.classList.remove('translate-y-12', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.add('translate-y-12', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2500);
}

// Copy Shareable Link Helper with Clipboard & Toast Feedback
async function copyShareableLink(trainNo, btnId = 'btnCopyLink', iconId = 'copyLinkIcon', textId = 'copyLinkText') {
    const shareUrl = getPublicShareUrl(trainNo);
    let copied = false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            copied = true;
        }
    } catch (e) {}

    if (!copied) {
        try {
            const ta = document.createElement('textarea');
            ta.value = shareUrl;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copied = true;
        } catch (e) {}
    }

    const btn = document.getElementById(btnId);
    const icon = document.getElementById(iconId);
    const text = document.getElementById(textId);

    if (btn) {
        const origIcon = icon ? icon.innerText : '';
        const origText = text ? text.innerText : '';
        if (icon) icon.innerText = 'check';
        if (text) text.innerText = t('link_copied');
        btn.classList.add('bg-emerald-50', 'dark:bg-emerald-950/40', 'border-emerald-400', 'text-emerald-700', 'dark:text-emerald-300');
        setTimeout(() => {
            if (icon) icon.innerText = origIcon;
            if (text) text.innerText = origText;
            btn.classList.remove('bg-emerald-50', 'dark:bg-emerald-950/40', 'border-emerald-400', 'text-emerald-700', 'dark:text-emerald-300');
        }, 2200);
    }

    showShareToast(t('link_copied'));
}

// Share Live Modal Controls
function openShareModal(trainNo) {
    const overlay = document.getElementById('share-modal-overlay');
    if (!overlay) return;

    const currentTrain = state.selectedTrain || (state.trains && state.trains[0]) || { no: '12841', name: 'COROMANDEL EXPRESS' };
    const targetNo = trainNo || currentTrain.no;
    const targetTrain = (state.trains || []).find(t => t.no === targetNo) || currentTrain;

    const nameEl = document.getElementById('shareModalTrainName');
    if (nameEl) {
        nameEl.innerText = `${targetTrain.no} - ${targetTrain.name}`;
    }

    const inputEl = document.getElementById('shareModalUrlInput');
    const shareUrl = getPublicShareUrl(targetNo);
    if (inputEl) {
        inputEl.value = shareUrl;
    }

    // Configure WhatsApp Button inside modal
    const btnWa = document.getElementById('btnModalShareWhatsApp');
    if (btnWa) {
        btnWa.onclick = () => {
            const delayStr = (targetTrain.delay && targetTrain.delay > 0) ? `${targetTrain.delay} mins late` : 'Running on time';
            const speedStr = targetTrain.speed ? `${targetTrain.speed} km/h` : '110 km/h';
            const etaStation = targetTrain.etaStation || 'Next Station';
            const eta = targetTrain.eta || '10:30 AM';
            const msg = `*JOURNEY Live Train Update*\n🚆 *${targetTrain.no} ${targetTrain.name}*\n⚡ *Current Speed:* ${speedStr}\n⏱️ *Running Status:* ${delayStr}\n🏁 *Expected Arrival:* ${eta} at ${etaStation}\n\n🔗 *Track Live on Journey:* ${shareUrl}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        };
    }

    overlay.classList.remove('hidden');
}

function closeShareModal() {
    const overlay = document.getElementById('share-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Bind UI Events
function bindEvents() {
    // Header Share Button: Opens the Share Live Modal
    const btnHeaderShare = document.getElementById('btnHeaderShareLink');
    if (btnHeaderShare) {
        btnHeaderShare.addEventListener('click', (e) => {
            e.preventDefault();
            const trainNo = state.selectedTrain ? state.selectedTrain.no : '12841';
            openShareModal(trainNo);
        });
    }

    // Share Modal Close & Copy Events
    const btnCloseShare = document.getElementById('btnCloseShareModal');
    if (btnCloseShare) {
        btnCloseShare.addEventListener('click', () => closeShareModal());
    }
    const shareOverlay = document.getElementById('share-modal-overlay');
    if (shareOverlay) {
        shareOverlay.addEventListener('click', (e) => {
            if (e.target === shareOverlay) closeShareModal();
        });
    }
    const btnModalCopy = document.getElementById('btnModalCopyLink');
    if (btnModalCopy) {
        btnModalCopy.addEventListener('click', () => {
            const trainNo = state.selectedTrain ? state.selectedTrain.no : '12841';
            copyShareableLink(trainNo, 'btnModalCopyLink', 'modalCopyIcon', 'modalCopyText');
        });
    }

    // Quick train buttons inside share modal
    document.querySelectorAll('.btn-quick-train').forEach(btn => {
        btn.addEventListener('click', () => {
            const tNo = btn.getAttribute('data-train');
            if (tNo) {
                const u = getPublicShareUrl(tNo);
                const inputEl = document.getElementById('shareModalUrlInput');
                if (inputEl) inputEl.value = u;
                const trainObj = (state.trains || []).find(t => t.no === tNo);
                const nameEl = document.getElementById('shareModalTrainName');
                if (nameEl && trainObj) nameEl.innerText = `${trainObj.no} - ${trainObj.name}`;
                copyShareableLink(tNo, 'btnModalCopyLink', 'modalCopyIcon', 'modalCopyText');
            }
        });
    });

    // Welcome Modal / How It Works Process Guide
    const btnStart = document.getElementById('btn-start-journey');
    const btnDismiss = document.getElementById('btn-dismiss-welcome');
    const btnShowWelcome = document.getElementById('btn-show-welcome');
    const btnCloseWelcome = document.getElementById('closeWelcomeModal');
    const overlay = document.getElementById('welcome-overlay');

    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            e.preventDefault();
            closeWelcomeModal(false);
        });
    }

    if (btnCloseWelcome) {
        btnCloseWelcome.addEventListener('click', (e) => {
            e.preventDefault();
            closeWelcomeModal(false);
        });
    }

    if (btnDismiss) {
        btnDismiss.addEventListener('click', (e) => {
            e.preventDefault();
            closeWelcomeModal(true);
        });
    }

    if (btnShowWelcome) {
        btnShowWelcome.addEventListener('click', (e) => {
            e.preventDefault();
            openWelcomeModal();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeWelcomeModal(false);
            }
        });
    }

    // Navigation Tabs
    elements.sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });

    // Search Input with Debouncing
    let searchTimer = null;
    if (elements.searchIn) {
        elements.searchIn.addEventListener('input', () => {
            updateClearBtn();
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => handleSearch(), 180);
        });
        elements.searchIn.addEventListener('focus', () => {
            updateClearBtn();
            if (elements.searchIn.value.trim().length > 0) {
                elements.searchIn.select();
            }
            handleSearch();
        });
        elements.searchIn.addEventListener('click', () => {
            updateClearBtn();
            handleSearch();
        });
    }

    if (elements.clearSearchBtn) {
        elements.clearSearchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (elements.searchIn) {
                elements.searchIn.value = '';
                elements.searchIn.focus();
                updateClearBtn();
                handleSearch();
            }
        });
    }

    // Close search dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('searchDropdown');
        if (dropdown && elements.searchIn && !elements.searchIn.contains(e.target) && !dropdown.contains(e.target) && (!elements.clearSearchBtn || !elements.clearSearchBtn.contains(e.target))) {
            dropdown.classList.add('hidden');
        }
    });

    // Schedule Search with Debouncing
    let schedTimer = null;
    if (elements.scheduleSearch) {
        elements.scheduleSearch.addEventListener('input', () => {
            clearTimeout(schedTimer);
            schedTimer = setTimeout(() => renderSchedule(), 200);
        });
    }

    // Station Search autocomplete
    setupStationAutocomplete(elements.stnFrom, elements.stnFromDropdown);
    setupStationAutocomplete(elements.stnTo, elements.stnToDropdown);

    const btnFindTrains = document.getElementById('btnFindTrains');
    if (btnFindTrains) {
        btnFindTrains.addEventListener('click', findStationTrains);
    }

    // Clear History Button
    const btnClearHistory = document.getElementById('btnClearHistory');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            state.history = [];
            localStorage.removeItem('journeyHistory');
            renderHistory();
            const countEl = document.getElementById('recentHistoryCount');
            if (countEl) countEl.innerText = '0';
        });
    }

    // Accessibility & Settings Popover
    if (elements.accessibilityBtn) {
        elements.accessibilityBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAccessibilityMenu();
        });
    }

    // Language Options
    document.querySelectorAll('.lang-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            state.lang = opt.dataset.lang;
            localStorage.setItem('journeyLang', state.lang);
            applyLanguage();
            toggleAccessibilityMenu(false);
        });
    });

    // Theme Options
    document.querySelectorAll('.theme-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            applyTheme(opt.dataset.theme);
            updateAccessibilityMenuUI();
            toggleAccessibilityMenu(false);
        });
    });

    // Time Format Options
    document.querySelectorAll('.time-format-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            state.timeFormat = opt.dataset.format;
            localStorage.setItem('journeyTimeFormat', state.timeFormat);
            updateAccessibilityMenuUI();
            updateLiveDisplays();
            if (state.selectedTrain) renderTrainDetail(state.selectedTrain);
            toggleAccessibilityMenu(false);
        });
    });

    // Refresh / Sync Button
    const syncButton = document.getElementById('syncButton');
    if (syncButton) {
        syncButton.addEventListener('click', () => triggerSync());
    }

    // Global Click to close popovers
    document.addEventListener('click', (e) => {
        if (elements.accessibilityDropdown && !elements.accessibilityDropdown.contains(e.target) && e.target !== elements.accessibilityBtn && !elements.accessibilityBtn.contains(e.target)) {
            toggleAccessibilityMenu(false);
        }
        const searchDropdown = document.getElementById('searchDropdown');
        if (searchDropdown && !searchDropdown.contains(e.target) && e.target !== elements.searchIn) {
            searchDropdown.classList.add('hidden');
        }
        if (elements.stnFromDropdown && !elements.stnFromDropdown.contains(e.target) && e.target !== elements.stnFrom) {
            elements.stnFromDropdown.classList.add('hidden');
        }
        if (elements.stnToDropdown && !elements.stnToDropdown.contains(e.target) && e.target !== elements.stnTo) {
            elements.stnToDropdown.classList.add('hidden');
        }
    });

    // Escape key listener to close modal and popovers
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeWelcomeModal(false);
            toggleAccessibilityMenu(false);
            const searchDropdown = document.getElementById('searchDropdown');
            if (searchDropdown) searchDropdown.classList.add('hidden');
            const diagModal = document.getElementById('supabaseDiagnosticModal');
            if (diagModal) diagModal.classList.add('hidden');
        }
    });
}

function toggleAccessibilityMenu(forceState) {
    if (!elements.accessibilityDropdown) return;
    const isHidden = elements.accessibilityDropdown.classList.contains('hidden');
    const shouldOpen = forceState !== undefined ? forceState : isHidden;

    if (shouldOpen) {
        elements.accessibilityDropdown.classList.remove('hidden');
        if (elements.accessibilityBtn) elements.accessibilityBtn.setAttribute('aria-expanded', 'true');
        updateAccessibilityMenuUI();
    } else {
        elements.accessibilityDropdown.classList.add('hidden');
        if (elements.accessibilityBtn) elements.accessibilityBtn.setAttribute('aria-expanded', 'false');
    }
}

function updateAccessibilityMenuUI() {
    document.querySelectorAll('.lang-opt').forEach(opt => {
        const isActive = opt.dataset.lang === state.lang;
        opt.classList.toggle('active', isActive);
        opt.classList.toggle('accessibility-opt-btn', true);
    });

    document.querySelectorAll('.theme-opt').forEach(opt => {
        const isActive = opt.dataset.theme === state.theme;
        opt.classList.toggle('active', isActive);
        opt.classList.toggle('accessibility-opt-btn', true);
    });

    document.querySelectorAll('.time-format-opt').forEach(opt => {
        const isActive = opt.dataset.format === state.timeFormat;
        opt.classList.toggle('active', isActive);
        opt.classList.toggle('accessibility-opt-btn', true);
    });
}

function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('journeyTheme', state.theme);
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
}

function switchTab(tabId) {
    state.currentTab = tabId;
    elements.sidebarLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tabId);
    });
    
    document.querySelectorAll('[data-tab-content]').forEach(tab => {
        if (tab.dataset.tabContent === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    if (tabId === 'train-schedule') renderSchedule();
    if (tabId === 'recently-viewed') renderHistory();
}

function applyLanguage() {
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        if (dict[el.dataset.i18n]) el.innerText = dict[el.dataset.i18n];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        if (dict[el.dataset.i18nPh]) el.placeholder = dict[el.dataset.i18nPh];
    });

    // Update dynamic header and status elements
    updateAccessibilityMenuUI();
    updateConnectionStatus(true);
    updateLiveDisplays();

    const schedSub = document.getElementById('scheduleDbSub');
    if (schedSub) {
        const count = state.totalTrainsInDb || 8673;
        schedSub.innerText = t('schedule_sub').replace('{n}', count.toLocaleString());
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lastSyncLabel = document.getElementById('lastSyncLabel');
    if (lastSyncLabel) lastSyncLabel.innerText = `${t('last_updated')}: ${timeStr} IST`;

    // Re-render active dynamic components
    if (state.selectedTrain) renderTrainDetail(state.selectedTrain);
    renderSuggestedTrains();

    if (state.currentTab === 'train-schedule') {
        renderSchedule();
    }
    if (state.currentTab === 'recently-viewed') {
        renderHistory();
    }
    if (state.currentTab === 'station-search' && elements.stnFrom && elements.stnTo && elements.stnFrom.value && elements.stnTo.value) {
        findStationTrains();
    }
}

// Load Popular Trains from Supabase
async function loadSuggestedTrains() {
    try {
        const featuredNos = [1021, 2051, 12841, 12951, 22436, 26403, 12002, 12301];
        const data = await supabaseFetch(`live_trains?train_no=in.(${featuredNos.join(',')})&order=train_no.asc`);
        
        if (data && data.length > 0) {
            state.suggestedTrains = data.map(d => ({
                no: String(d.train_no),
                name: formatTrainName(d.train_name),
                type: formatTrainType(d.type_code),
                originName: formatStationName(d.origin_station_name),
                destName: formatStationName(d.destination_station_name),
                currentStation: formatStationName(d.current_station_name),
                speed: Math.round(d.speed_kmph || 0),
                delay: Math.round(d.adjusted_delay || 0),
                eta: d.eta
            }));
            renderSuggestedTrains();
            return;
        }
    } catch (e) {
        console.warn('Using local suggested trains:', e);
    }
    state.suggestedTrains = TRAIN_DATA;
    renderSuggestedTrains();
}

function updateClearBtn() {
    const btn = document.getElementById('clearSearchBtn') || elements.clearSearchBtn;
    if (!btn || !elements.searchIn) return;
    if (elements.searchIn.value.trim().length > 0) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

function renderSuggestedTrains() {
    if (!elements.suggestedList) return;
    const trains = state.suggestedTrains.length > 0 ? state.suggestedTrains : TRAIN_DATA;
    elements.suggestedList.innerHTML = trains.map(tr => `
        <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 p-3 rounded-xl shadow-2xs hover:border-[#8e1b29] dark:hover:border-red-900 cursor-pointer transition-all flex items-center justify-between group" onclick="selectTrain('${tr.no}', true)">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-[#8e1b29] group-hover:bg-[#8e1b29] group-hover:text-white transition-colors shrink-0">
                    <span class="material-symbols-outlined text-[18px]">train</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold truncate text-[#0f172a] dark:text-white font-mono">${tr.no}</span>
                        <span class="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">${t('live_gps')}</span>
                    </div>
                    <span class="text-[10px] text-gray-500 dark:text-gray-400 truncate">${tr.name}</span>
                </div>
            </div>
            <div class="text-right shrink-0">
                <span class="text-[10px] font-mono text-gray-400 block">${tr.speed ? tr.speed + ' km/h' : t('status_active')}</span>
                ${tr.delay > 5 ? `<span class="text-[9px] text-[#c2410c] font-bold">+${tr.delay}m</span>` : `<span class="text-[9px] text-emerald-600 font-bold">${t('ontime')}</span>`}
            </div>
        </div>`).join('');
}

// Live Search with Supabase
async function handleSearch() {
    const query = elements.searchIn ? elements.searchIn.value.trim() : '';
    const dropdown = document.getElementById('searchDropdown');
    const label = document.getElementById('searchDropdownLabel');
    if (!dropdown) return;

    let results = [];
    if (!query) {
        if (label) label.innerText = t('popular_trains');
        results = state.suggestedTrains.length > 0 ? state.suggestedTrains : TRAIN_DATA;
    } else {
        if (label) label.innerText = t('matching_trains_for').replace('{q}', query);
        try {
            let endpoint = 'live_trains?limit=10&';
            if (/^\d{1,5}$/.test(query)) {
                const padStart = query.padEnd(5, '0');
                const padEnd = query.padEnd(5, '9');
                endpoint += `or=(train_no.eq.${query},and(train_no.gte.${padStart},train_no.lte.${padEnd}))&order=train_no.asc`;
            } else {
                endpoint += `train_name=ilike.*${encodeURIComponent(query)}*`;
            }

            const data = await supabaseFetch(endpoint);
            if (data && data.length > 0) {
                results = data.map(d => ({
                    no: String(d.train_no),
                    name: formatTrainName(d.train_name),
                    type: formatTrainType(d.type_code),
                    originName: formatStationName(d.origin_station_name),
                    destName: formatStationName(d.destination_station_name),
                    currentStation: formatStationName(d.current_station_name),
                    speed: Math.round(d.speed_kmph || 0),
                    delay: Math.round(d.adjusted_delay || 0)
                }));
            }
        } catch (e) {
            console.warn('Search query error, using local match:', e);
        }

        // Local fallback match if Supabase query returned no matches
        if (results.length === 0) {
            const qLower = query.toLowerCase();
            results = TRAIN_DATA.filter(t => t.no.includes(query) || t.name.toLowerCase().includes(qLower));
        }
    }

    if (results.length === 0) {
        elements.searchList.innerHTML = `
            <div class="p-4 text-center text-xs text-gray-400">
                ${t('no_train_found').replace('{q}', query)}
            </div>`;
    } else {
        elements.searchList.innerHTML = results.map(tr => `
            <div class="p-3 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0" onclick="selectTrain('${tr.no}', true)">
                <div class="flex items-center gap-3">
                    <span class="w-12 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-[#8e1b29] dark:text-red-400 flex items-center justify-center text-xs font-bold font-mono">${tr.no}</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold dark:text-white text-[#0f172a]">${tr.name}</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold">${t('live_gps')}</span>
                        </div>
                        <span class="block text-[11px] text-gray-500">${tr.originName || 'Origin'} → ${tr.destName || 'Destination'}</span>
                    </div>
                </div>
                <div class="text-right">
                    ${tr.currentStation ? `<span class="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400">@ ${tr.currentStation}</span>` : ''}
                    ${tr.delay > 5 ? `<span class="text-[10px] font-mono text-[#c2410c] dark:text-orange-400">+${tr.delay}m ${t('late_short')}</span>` : `<span class="text-[10px] text-emerald-600 font-bold">${t('ontime')}</span>`}
                </div>
            </div>`).join('');
    }

    dropdown.classList.remove('hidden');
}

// Select Train & Fetch Live Telemetry from Supabase
async function selectTrain(no, updateSearchInput = false) {
    // Check if we already have this train loaded locally
    let train = TRAIN_DATA.find(t => t.no === no);
    if (train) {
        state.selectedTrain = train;
        addToHistory(train);
        renderTrainDetail(train);
        if (updateSearchInput && elements.searchIn) {
            elements.searchIn.value = `${train.no} - ${train.name}`;
            updateClearBtn();
        }
    }

    try {
        // 1. Fetch live telemetry row from live_trains
        const liveRows = await supabaseFetch(`live_trains?train_no=eq.${no}`);
        const live = (liveRows && liveRows.length > 0) ? liveRows[0] : null;

        // 2. Fetch stops timetable from train_schedule
        const schedRows = await supabaseFetch(`train_schedule?train_no=eq.${no}&order=station_no.asc`);
        
        // Deduplicate stops by station_code
        const seenStns = new Set();
        const rawStops = [];
        if (schedRows && schedRows.length > 0) {
            for (const s of schedRows) {
                if (!seenStns.has(s.station_code)) {
                    seenStns.add(s.station_code);
                    rawStops.push(s);
                }
            }
        }

        if (live) {
            const currentCode = (live.current_station_code || '').toUpperCase();
            let curIdx = rawStops.findIndex(s => s.station_code.toUpperCase() === currentCode);
            if (curIdx === -1) {
                curIdx = Math.max(0, Math.floor(rawStops.length / 2));
            }

            const totalDist = rawStops.length > 0 ? (rawStops[rawStops.length - 1].distance_from_origin || 1000) : 1000;
            const currentDist = (rawStops[curIdx] && rawStops[curIdx].distance_from_origin) || Math.round(totalDist * 0.5);
            const percent = Math.min(100, Math.max(5, Math.round((currentDist / totalDist) * 100)));
            const delayMin = Math.round(live.adjusted_delay || 0);
            const speedKmph = Math.round(live.speed_kmph || 0);

            // Build passenger-friendly stops array
            const processedStops = rawStops.map((s, idx) => {
                const isPassed = idx < curIdx;
                const isCurrent = idx === curIdx;
                const isTerminus = idx === rawStops.length - 1;
                const schedTime = s.departure_time || s.arrival_time || '--:--';
                const pf = `Platform ${(s.station_no % 4) + 1}`;

                let status = 'On time';
                let onTime = true;
                if (isPassed) {
                    onTime = delayMin <= 5;
                    status = delayMin > 5 ? `${delayMin} mins late` : 'Departed on time';
                } else if (isCurrent) {
                    status = 'Current Location';
                } else if (isTerminus) {
                    status = 'Final Destination';
                } else {
                    status = delayMin > 5 ? `Expected ~${delayMin}m late` : 'On time';
                }

                return {
                    code: s.station_code,
                    name: formatStationName(s.station_name),
                    dist: s.distance_from_origin || 0,
                    pf: isTerminus ? 'Terminus' : pf,
                    sched: schedTime,
                    status: status,
                    passed: isPassed,
                    current: isCurrent,
                    isTerminus: isTerminus,
                    onTime: onTime,
                    isDelay: delayMin > 5
                };
            });

            // Estimated remaining time formatted
            const remMin = live.remaining_minutes || Math.round((totalDist - currentDist) / Math.max(1, speedKmph) * 60);
            const remHours = Math.floor(remMin / 60);
            const remMinsLeft = remMin % 60;
            const remTimeText = `Approx. ${remHours}h ${remMinsLeft}m remaining`;

            const updatedTrain = {
                no: String(live.train_no),
                name: formatTrainName(live.train_name),
                type: formatTrainType(live.type_code),
                coaches: '22 Coaches • LHB Superfast Express',
                origin: live.origin_station_code,
                originName: formatStationName(live.origin_station_name),
                dest: live.destination_station_code,
                destName: formatStationName(live.destination_station_name),
                delay: delayMin,
                speed: speedKmph,
                maxSpeed: 130,
                eta: live.eta || 'On Schedule',
                etaStation: formatStationName(live.destination_station_name),
                progressKm: currentDist,
                totalKm: totalDist,
                percentComplete: `${percent}%`,
                remainingTime: remTimeText,
                signal: live.signal || 'green',
                weather: live.weather || 'clear',
                currentStationCode: live.current_station_code,
                currentStationName: formatStationName(live.current_station_name),
                stops: processedStops.length > 0 ? processedStops : (train ? train.stops : [])
            };

            state.selectedTrain = updatedTrain;
            // Update in TRAIN_DATA
            const idx = TRAIN_DATA.findIndex(t => t.no === String(live.train_no));
            if (idx !== -1) {
                TRAIN_DATA[idx] = updatedTrain;
            } else {
                TRAIN_DATA.push(updatedTrain);
            }
            renderTrainDetail(updatedTrain);
        }
    } catch (err) {
        console.warn('Error fetching live train from Supabase, loading fallback:', err);
    }

    if (updateSearchInput && elements.searchIn && state.selectedTrain) {
        elements.searchIn.value = `${state.selectedTrain.no} - ${state.selectedTrain.name}`;
        updateClearBtn();
    }
    const searchDropdown = document.getElementById('searchDropdown');
    if (searchDropdown) searchDropdown.classList.add('hidden');
    if (elements.detailView) elements.detailView.classList.remove('hidden');
}

function addToHistory(train) {
    state.history = state.history.filter(t => t.no !== train.no);
    state.history.unshift({
        no: train.no,
        name: train.name,
        originName: train.originName,
        destName: train.destName,
        lastViewed: new Date().toISOString()
    });
    if (state.history.length > 10) state.history.pop();
    localStorage.setItem('journeyHistory', JSON.stringify(state.history));
    
    const countEl = document.getElementById('recentHistoryCount');
    if (countEl) countEl.innerText = state.history.length;
}

// Render Train Detail & Empathetic Passenger UI
function renderTrainDetail(train) {
    if (!train) return;

    const currentStop = (train.stops && train.stops.find(s => s.current)) || 
        (train.stops && train.stops[0]) || {
            name: train.currentStationName || train.destName || 'Current Station',
            code: train.currentStationCode || '',
            pf: 'Platform 1',
            sched: train.eta || '--:--',
            dist: train.progressKm || 0
        };

    // Detail Header
    const detailHeader = document.getElementById('detailHeader');
    if (detailHeader) {
        detailHeader.innerHTML = `
            <div class="flex flex-col">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#8e1b29] dark:text-red-400" data-i18n="live_journey_title">${t('live_journey_title')}</span>
                <h2 class="text-lg font-bold text-[#0f172a] dark:text-white mt-0.5">${train.no} ${train.name}</h2>
                <p class="text-xs text-gray-500">${train.originName} → ${train.destName} • ${train.type}</p>
            </div>`;
    }

    // Station Timeline
    let timelineHtml = `
        <div class="hidden sm:grid grid-cols-12 px-3 py-2 bg-gray-50 dark:bg-[#121824] border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] font-bold uppercase text-gray-400 mb-3">
            <div class="col-span-5">${t('th_station')}</div>
            <div class="col-span-2 text-right">${t('th_distance')}</div>
            <div class="col-span-2 text-center">${t('th_timing')}</div>
            <div class="col-span-3 text-right">${t('th_status')}</div>
        </div>
        <div class="timeline-stem"></div>`;

    if (train.stops && train.stops.length > 0) {
        train.stops.forEach((stop) => {
            if (stop.current) {
                // Prominent Burgundy Highlight for Current Location
                timelineHtml += `
                    <div class="flex items-start gap-3.5 p-4 bg-[#fdf2f3] dark:bg-red-950/30 border-l-4 border-[#8e1b29] border-y border-r border-red-200 dark:border-red-900/50 rounded-r-2xl my-3 relative z-10 shadow-xs">
                        <div class="shrink-0 pt-0.5">
                            <div class="relative w-8 h-8 bg-[#8e1b29] rounded-full flex items-center justify-center text-white shadow-xs">
                                <span class="animate-ping absolute inset-0 rounded-full bg-red-400 opacity-60"></span>
                                <span class="material-symbols-outlined text-[17px] z-10">directions_train</span>
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center justify-between gap-2">
                                <div>
                                    <span class="text-sm font-extrabold text-[#0f172a] dark:text-white">${stop.name} (${stop.code})</span>
                                    <span class="ml-2 px-2.5 py-0.5 bg-[#8e1b29] text-white rounded-full text-[9px] uppercase font-bold tracking-wider">
                                        ${t('train_is_here')}
                                    </span>
                                </div>
                                <span class="px-2.5 py-0.5 bg-[#fff7ed] dark:bg-amber-950/50 border border-[#fed7aa] dark:border-amber-800 text-[#c2410c] dark:text-amber-300 rounded-full font-mono text-[11px] font-bold">
                                    ${train.delay > 0 ? t('running_late').replace('{d}', train.delay) : t('running_ontime')}
                                </span>
                            </div>
                            <div class="mt-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-3">
                                <span class="font-medium">${stop.pf}</span>
                                <span class="text-gray-300">•</span>
                                <span class="font-mono text-gray-500">${stop.sched}</span>
                                <span class="text-gray-300">•</span>
                                <span class="text-emerald-700 dark:text-emerald-400 font-medium">${t('moving_at').replace('{s}', train.speed)}</span>
                            </div>
                        </div>
                    </div>`;
            } else if (stop.passed) {
                let statusText = stop.onTime ? t('departed_ontime') : t('ontime');
                if (stop.isDelay) {
                    const match = (stop.status || '').match(/\d+/);
                    const d = match ? match[0] : train.delay;
                    statusText = t('running_late').replace('{d}', d);
                }
                timelineHtml += `
                    <div class="flex items-start gap-3 py-2.5 px-2 hover:bg-gray-50 dark:hover:bg-[#121824] rounded-lg transition-colors relative z-10">
                        <div class="shrink-0 w-7 flex justify-center pt-1.5">
                            <div class="w-3 h-3 rounded-full bg-[#1e293b] dark:bg-gray-400"></div>
                        </div>
                        <div class="flex-1 grid grid-cols-12 items-center">
                            <div class="col-span-5">
                                <span class="font-bold text-xs text-[#0f172a] dark:text-white">${stop.name} (${stop.code})</span>
                                <span class="block text-[10px] text-gray-400">${stop.pf}</span>
                            </div>
                            <div class="col-span-2 text-right font-mono text-xs text-gray-400">${stop.dist} km</div>
                            <div class="col-span-2 text-center font-mono text-xs text-gray-600 dark:text-gray-300">${stop.sched}</div>
                            <div class="col-span-3 text-right">
                                <span class="px-2 py-0.5 rounded text-[10px] font-medium ${stop.onTime ? 'badge-ontime' : 'badge-delay font-semibold'}">
                                    ${statusText}
                                </span>
                            </div>
                        </div>
                    </div>`;
            } else if (stop.isTerminus) {
                timelineHtml += `
                    <div class="flex items-start gap-3 py-3.5 px-3 bg-red-50/50 dark:bg-red-950/15 rounded-xl mt-2 relative z-10 border border-red-100 dark:border-red-900/40">
                        <div class="shrink-0 w-7 flex justify-center pt-0.5 text-[#8e1b29]">
                            <span class="material-symbols-outlined text-[20px]">flag</span>
                        </div>
                        <div class="flex-1 grid grid-cols-12 items-center">
                            <div class="col-span-5">
                                <span class="font-bold text-xs text-[#8e1b29] dark:text-red-400">${t('final_dest')}</span>
                                <span class="block text-sm font-bold text-[#0f172a] dark:text-white">${stop.name} (${stop.code})</span>
                                <span class="block text-[10px] text-gray-400 font-mono">${t('total_distance').replace('{d}', stop.dist)}</span>
                            </div>
                            <div class="col-span-4 text-center font-mono text-xs text-gray-700 dark:text-gray-200">
                                ${stop.sched}
                            </div>
                            <div class="col-span-3 text-right">
                                <span class="px-2.5 py-0.5 bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] rounded-full text-[10px] font-bold">
                                    ${train.delay > 0 ? t('expected_late').replace('{d}', train.delay) : t('on_schedule')}
                                </span>
                            </div>
                        </div>
                    </div>`;
            } else {
                let statusText = t('ontime');
                if (stop.isDelay) {
                    const match = (stop.status || '').match(/\d+/);
                    const d = match ? match[0] : train.delay;
                    statusText = t('expected_late').replace('{d}', d);
                }
                timelineHtml += `
                    <div class="flex items-start gap-3 py-2.5 px-2 hover:bg-gray-50 dark:hover:bg-[#121824] rounded-lg transition-colors relative z-10 opacity-80">
                        <div class="shrink-0 w-7 flex justify-center pt-1.5">
                            <div class="w-3 h-3 rounded-full border-2 border-gray-400 bg-white dark:bg-[#181e29]"></div>
                        </div>
                        <div class="flex-1 grid grid-cols-12 items-center">
                            <div class="col-span-5">
                                <span class="font-medium text-xs text-[#0f172a] dark:text-white">${stop.name} (${stop.code})</span>
                                <span class="block text-[10px] text-gray-400">${stop.pf}</span>
                            </div>
                            <div class="col-span-2 text-right font-mono text-xs text-gray-400">${stop.dist} km</div>
                            <div class="col-span-2 text-center font-mono text-xs text-gray-500">${stop.sched}</div>
                            <div class="col-span-3 text-right">
                                <span class="px-2 py-0.5 rounded text-[10px] font-medium ${stop.isDelay ? 'badge-delay font-semibold' : 'badge-ontime'}">
                                    ${statusText}
                                </span>
                            </div>
                        </div>
                    </div>`;
            }
        });
    }
    const detailTimeline = document.getElementById('detailTimeline');
    if (detailTimeline) detailTimeline.innerHTML = timelineHtml;

    // Signal & Weather logic
    let signalLabel = t('signal_green');
    let signalDotClass = 'bg-emerald-500';
    if (train.signal === 'yellow' || train.signal === 'amber') {
        signalLabel = t('signal_amber');
        signalDotClass = 'bg-amber-500';
    } else if (train.signal === 'red') {
        signalLabel = t('signal_red');
        signalDotClass = 'bg-rose-500 animate-pulse';
    }

    let weatherIcon = 'wb_sunny';
    let weatherLabel = t('weather_clear');
    if (train.weather === 'cloudy') {
        weatherIcon = 'cloud';
        weatherLabel = t('weather_cloudy');
    } else if (train.weather === 'fog') {
        weatherIcon = 'foggy';
        weatherLabel = t('weather_fog');
    } else if (train.weather === 'rainy' || train.weather === 'rain') {
        weatherIcon = 'rainy';
        weatherLabel = t('weather_rain');
    }

    // Delay explanation text
    let delayForecastText = '';
    if (train.delay === 0) {
        delayForecastText = t('forecast_ontime');
    } else if (train.delay <= 15) {
        delayForecastText = t('forecast_minor').replace('{d}', train.delay).replace('{s}', train.speed);
    } else {
        delayForecastText = t('forecast_major').replace('{d}', train.delay).replace('{stn}', currentStop.name);
    }

    // Right Column Telemetry Card with Dark Burgundy Reassurance Card
    const detailTelemetry = document.getElementById('detailTelemetry');
    if (detailTelemetry) {
        detailTelemetry.innerHTML = `
            <!-- Train Live Summary Card -->
            <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
                <div class="flex items-start justify-between">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 font-mono font-bold text-xs text-[#0f172a] dark:text-white rounded border border-gray-200 dark:border-gray-700">${train.no}</span>
                            <span class="px-2.5 py-0.5 bg-[#8e1b29] text-white rounded-full text-[10px] font-bold uppercase tracking-wider">${t('live_tracking_badge')}</span>
                        </div>
                        <h3 class="text-xl font-bold text-[#0f172a] dark:text-white mt-1.5">${train.name}</h3>
                        <p class="text-xs text-gray-500">${train.originName} → ${train.destName}</p>
                    </div>
                </div>

                <!-- 3 Friendly Metric Cards -->
                <div class="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div class="bg-[#f8fafc] dark:bg-[#121824] p-3 rounded-xl text-center border border-gray-100 dark:border-gray-800">
                        <span class="block text-[10px] font-bold text-gray-400 uppercase">${t('est_arrival')}</span>
                        <span class="text-base sm:text-lg font-mono font-extrabold text-[#0f172a] dark:text-white truncate block">${train.eta}</span>
                        <span class="block text-[9px] text-gray-400 truncate">${t('at_station').replace('{s}', train.etaStation)}</span>
                    </div>
                    <div class="bg-[#fff7ed] dark:bg-amber-950/20 p-3 rounded-xl text-center border border-[#fed7aa] dark:border-amber-900/40">
                        <span class="block text-[10px] font-bold text-amber-700 uppercase">${t('current_delay')}</span>
                        <span class="text-base sm:text-lg font-mono font-extrabold text-[#c2410c]">${train.delay > 0 ? t('delay_min').replace('{d}', train.delay) : t('delay_zero')}</span>
                        <span class="block text-[9px] text-amber-600 font-medium">${train.delay > 0 ? t('running_late_status') : t('ontime')}</span>
                    </div>
                    <div class="bg-[#f8fafc] dark:bg-[#121824] p-3 rounded-xl text-center border border-gray-100 dark:border-gray-800">
                        <span class="block text-[10px] font-bold text-gray-400 uppercase">${t('current_speed')}</span>
                        <span class="text-base sm:text-lg font-mono font-extrabold text-emerald-600">${train.speed} <small class="text-[10px]">km/h</small></span>
                        <span class="block text-[9px] text-gray-400">${t('live_gps')}</span>
                    </div>
                </div>

                <!-- Progress Bar Strip -->
                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                    <div class="flex justify-between text-xs">
                        <span class="font-medium text-gray-600 dark:text-gray-300">${t('journey_progress')}</span>
                        <span class="font-bold text-[#8e1b29] dark:text-red-400">${train.percentComplete} ${t('completed')}</span>
                    </div>
                    <div class="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-[#8e1b29] rounded-full transition-all duration-500" style="width: ${train.percentComplete}"></div>
                    </div>
                    <div class="flex justify-between text-[10px] text-gray-400 pt-0.5">
                        <span>${train.originName}</span>
                        <span class="text-[#8e1b29] font-bold">${t('now_at').replace('{s}', currentStop.name)}</span>
                        <span>${train.destName}</span>
                    </div>
                    <p class="text-xs text-gray-500 text-center pt-1.5 font-medium">
                        ${train.remainingTime}
                    </p>
                </div>
            </div>

            <!-- Travel & Station Conditions -->
            <div class="grid grid-cols-2 gap-2.5">
                <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center gap-2.5 shadow-2xs">
                    <span class="w-3 h-3 rounded-full ${signalDotClass} shrink-0"></span>
                    <div>
                        <span class="block text-[10px] text-gray-400 uppercase font-bold">${t('track_signal')}</span>
                        <span class="text-xs font-bold text-[#0f172a] dark:text-white">${signalLabel}</span>
                    </div>
                </div>
                <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center gap-2.5 shadow-2xs">
                    <span class="material-symbols-outlined text-[18px] text-amber-500 shrink-0">${weatherIcon}</span>
                    <div>
                        <span class="block text-[10px] text-gray-400 uppercase font-bold">${t('route_weather')}</span>
                        <span class="text-xs font-bold text-[#0f172a] dark:text-white">${weatherLabel}</span>
                    </div>
                </div>
            </div>

            <!-- Reassuring Deep Maroon Summary Card -->
            <div class="bg-[#5a121a] text-white rounded-xl p-4 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="block text-[10px] text-red-200 uppercase tracking-wider font-semibold">${t('current_delay')}</span>
                        <span class="text-xl font-bold text-white font-mono">${train.delay > 0 ? `+${train.delay}m ${t('late_short')}` : t('ontime')}</span>
                        <span class="block text-[10px] text-red-300">${t('at_station').replace('{s}', currentStop.name)}</span>
                    </div>
                    <div class="text-right">
                        <span class="block text-[10px] text-red-200 uppercase tracking-wider font-semibold">${t('expected_dest')}</span>
                        <span class="text-sm font-bold text-emerald-300 font-mono">${train.delay > 0 ? `~${Math.max(0, Math.round(train.delay * 0.7))}m ${t('late_short')}` : t('on_schedule')}</span>
                        <span class="block text-[10px] text-red-200">${t('reaching_by').replace('{t}', train.eta)}</span>
                    </div>
                </div>
                <p class="text-[10px] text-red-200 mt-2.5 border-t border-red-900/60 pt-2 italic">
                    ${delayForecastText}
                </p>
            </div>

            <!-- Dual Action Sharing Bar -->
            <div class="flex flex-col sm:flex-row items-center gap-2.5">
                <!-- Copy Shareable Link Button -->
                <button id="btnCopyLink" class="w-full sm:flex-1 py-3 px-4 bg-white dark:bg-[#121824] hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0f172a] dark:text-white border border-gray-200 dark:border-gray-700 font-bold text-xs rounded-xl shadow-2xs hover:border-[#8e1b29] dark:hover:border-red-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                    <span class="material-symbols-outlined text-[17px] text-[#8e1b29] dark:text-red-400" id="copyLinkIcon">link</span>
                    <span id="copyLinkText" data-i18n="copy_link">${t('copy_link')}</span>
                </button>

                <!-- WhatsApp Share Button -->
                <button id="btnShareLive" class="w-full sm:flex-1 py-3 px-4 bg-[#8e1b29] hover:bg-[#771420] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98">
                    <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.966.924 3.149.924 3.182 0 5.767-2.587 5.767-5.766.001-3.187-2.575-5.766-5.767-5.766zm10.165 5.765c0 5.685-4.624 10.308-10.309 10.308-1.765 0-3.486-.46-5.006-1.332l-5.681 1.488 1.516-5.528c-.962-1.572-1.47-3.39-1.47-5.236 0-5.685 4.624-10.308 10.309-10.308 5.685 0 10.309 4.623 10.309 10.308z"></path></svg>
                    <span data-i18n="btn_share">${t('btn_share')}</span>
                </button>
            </div>`;
    }

    // Dynamic Shareable URL
    const getShareableUrl = () => getPublicShareUrl(train.no);

    // Wire up Copy Link button
    const btnCopyLink = document.getElementById('btnCopyLink');
    if (btnCopyLink) {
        btnCopyLink.onclick = () => {
            copyShareableLink(train.no, 'btnCopyLink', 'copyLinkIcon', 'copyLinkText');
        };
    }

    // Wire up WhatsApp sharing
    const btnShareLive = document.getElementById('btnShareLive');
    if (btnShareLive) {
        btnShareLive.onclick = () => {
            const delayStr = train.delay > 0 ? `${train.delay} mins late` : 'Running on time';
            const shareUrl = getShareableUrl();
            const shareText = `*JOURNEY Live Train Update*\n🚆 *${train.no} ${train.name}*\n📍 *Current Station:* ${currentStop.name} (${currentStop.code})\n⚡ *Current Speed:* ${train.speed} km/h\n⏱️ *Running Status:* ${delayStr}\n🏁 *Expected Arrival:* ${train.eta} at ${train.etaStation}\n\n🔗 *Track Live on Journey:* ${shareUrl}`;
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
            window.open(waUrl, '_blank');
        };
    }
}

// Render Train Schedule Tab (Browsing live trains directly from Supabase)
async function renderSchedule(append = false) {
    const filter = (elements.scheduleSearch ? elements.scheduleSearch.value : '').toLowerCase().trim();
    
    if (!append) {
        state.scheduleOffset = 0;
        state.scheduleTrains = [];
    }

    let list = [];
    try {
        let endpoint = '';
        if (filter) {
            if (/^\d{1,5}$/.test(filter)) {
                const padStart = filter.padEnd(5, '0');
                const padEnd = filter.padEnd(5, '9');
                endpoint = `live_trains?select=train_no,train_name,type_code,origin_station_name,destination_station_name,current_station_name,speed_kmph,adjusted_delay,eta&or=(train_no.eq.${filter},and(train_no.gte.${padStart},train_no.lte.${padEnd}))&order=train_no.asc&limit=30`;
            } else {
                endpoint = `live_trains?select=train_no,train_name,type_code,origin_station_name,destination_station_name,current_station_name,speed_kmph,adjusted_delay,eta&train_name=ilike.*${encodeURIComponent(filter)}*&order=train_no.asc&limit=30`;
            }
        } else {
            endpoint = `live_trains?select=train_no,train_name,type_code,origin_station_name,destination_station_name,current_station_name,speed_kmph,adjusted_delay,eta&order=train_no.asc&limit=30&offset=${state.scheduleOffset}`;
        }

        const data = await supabaseFetch(endpoint);
        if (data && data.length > 0) {
            const mapped = data.map(d => ({
                no: String(d.train_no),
                name: formatTrainName(d.train_name),
                type: formatTrainType(d.type_code),
                originName: formatStationName(d.origin_station_name),
                destName: formatStationName(d.destination_station_name),
                currentStation: formatStationName(d.current_station_name),
                speed: Math.round(d.speed_kmph || 0),
                delay: Math.round(d.adjusted_delay || 0),
                eta: d.eta
            }));
            
            if (append) {
                state.scheduleTrains = [...state.scheduleTrains, ...mapped];
            } else {
                state.scheduleTrains = mapped;
            }
            list = state.scheduleTrains;
        }
    } catch (e) {
        console.warn('Schedule database query notice:', e);
    }

    if (list.length === 0 && !append) {
        list = [...state.suggestedTrains, ...TRAIN_DATA];
    }

    if (!elements.scheduleList) return;

    elements.scheduleList.innerHTML = list.map(tr => `
        <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 hover:border-l-[#8e1b29] group" onclick="selectTrain('${tr.no}'); switchTab('spot-your-train');">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-1.5">
                    <span class="text-sm font-mono font-extrabold text-[#0f172a] dark:text-white">${tr.no}</span>
                    <span class="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[9px] font-bold">${t('live_gps')}</span>
                </div>
                <span class="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-[#8e1b29] dark:text-red-400 text-[10px] font-bold rounded-full">${tr.type || 'EXPRESS'}</span>
            </div>
            <h4 class="font-bold dark:text-white text-[#0f172a] text-sm uppercase truncate group-hover:text-[#8e1b29] transition-colors">${tr.name}</h4>
            <p class="text-xs text-gray-500 mt-1 truncate">${tr.originName || 'Origin'} → ${tr.destName || 'Destination'}</p>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div class="flex flex-col">
                    <span class="text-[9px] uppercase font-bold text-gray-400">${t('current_position')}</span>
                    <span class="font-mono text-xs font-bold text-emerald-600 truncate">${tr.currentStation ? '@ ' + tr.currentStation : (tr.speed > 0 ? tr.speed + ' km/h' : t('on_schedule'))}</span>
                </div>
                <div class="flex flex-col text-right">
                    <span class="text-[9px] uppercase font-bold text-gray-400">${t('status_delay')}</span>
                    <span class="font-mono text-xs font-bold ${tr.delay > 5 ? 'text-[#c2410c] dark:text-orange-400' : 'text-emerald-600'}">
                        ${tr.delay > 0 ? `+${tr.delay}m ${t('late_short')}` : t('ontime')}
                    </span>
                </div>
            </div>
        </div>`).join('');

    const loadMoreContainer = document.getElementById('scheduleLoadMoreContainer');
    if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', Boolean(filter));
    }
}

// Setup Supabase Connection Diagnostic Modal
function setupSupabaseModal() {
    const modal = document.getElementById('supabaseDiagnosticModal');
    const openBtn = document.getElementById('supabaseModalBtn');
    const closeBtn = document.getElementById('closeSupabaseModal');
    const closeBottomBtn = document.getElementById('btnCloseSupabaseModalBottom');
    const testBtn = document.getElementById('btnRunTestQuery');
    const outputPre = document.getElementById('modalQueryOutput');

    async function runLiveQueryTest() {
        if (!outputPre) return;
        outputPre.innerText = 'Connecting to live satellite telemetry feed...';
        try {
            const t0 = performance.now();
            const data = await supabaseFetch('live_trains?select=train_no,train_name,type_code,current_station_name,speed_kmph,adjusted_delay,eta&limit=3');
            const latency = Math.round(performance.now() - t0);
            outputPre.innerText = `// HTTP 200 OK (${latency}ms latency)\n// Sample 3 trains loaded directly from live telemetry feed:\n` + JSON.stringify(data, null, 2);
        } catch (err) {
            outputPre.innerText = `Error querying live network feed:\n${err.message}`;
        }
    }

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            runLiveQueryTest();
        });
    }

    const statusBadgeFooter = document.getElementById('supabaseStatus');
    if (statusBadgeFooter && modal) {
        statusBadgeFooter.style.cursor = 'pointer';
        statusBadgeFooter.title = 'Click to inspect live network telemetry';
        statusBadgeFooter.addEventListener('click', () => {
            modal.classList.remove('hidden');
            runLiveQueryTest();
        });
    }

    [closeBtn, closeBottomBtn].forEach(btn => {
        if (btn && modal) {
            btn.addEventListener('click', () => modal.classList.add('hidden'));
        }
    });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    if (testBtn) {
        testBtn.addEventListener('click', runLiveQueryTest);
    }

    const btnLoadMore = document.getElementById('btnLoadMoreSchedule');
    if (btnLoadMore) {
        btnLoadMore.addEventListener('click', () => {
            state.scheduleOffset += 30;
            renderSchedule(true);
        });
    }
}

// Render Recently Viewed History Tab
function renderHistory() {
    if (state.history.length === 0) {
        elements.historyEmpty.classList.remove('hidden');
        elements.recentList.innerHTML = '';
        return;
    }
    elements.historyEmpty.classList.add('hidden');
    elements.recentList.innerHTML = state.history.map(t => `
        <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-all" onclick="selectTrain('${t.no}'); switchTab('spot-your-train');">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-[#8e1b29] dark:text-red-400 flex items-center justify-center">
                    <span class="material-symbols-outlined">train</span>
                </div>
                <div>
                    <span class="font-bold text-[#0f172a] dark:text-white text-sm">${t.no} - ${t.name}</span>
                    <span class="block text-[11px] text-gray-500">${t.originName} → ${t.destName}</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono text-gray-400">${new Date(t.lastViewed).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                <span class="material-symbols-outlined text-gray-400 text-[18px]">chevron_right</span>
            </div>
        </div>`).join('');
}

// Autocomplete for Station Search
function setupStationAutocomplete(input, dropdown) {
    if (!input || !dropdown) return;
    let timer = null;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const val = input.value.trim();
            if (!val || val.length < 2) { 
                dropdown.classList.add('hidden'); 
                return; 
            }

            try {
                const endpoint = `train_schedule?station_name=ilike.*${encodeURIComponent(val)}*&select=station_code,station_name&limit=15`;
                const data = await supabaseFetch(endpoint);
                const seen = new Set();
                const unique = [];
                for (const s of data) {
                    if (!seen.has(s.station_code)) {
                        seen.add(s.station_code);
                        unique.push(s);
                    }
                }

                if (unique.length > 0) {
                    dropdown.innerHTML = unique.slice(0, 6).map(s => `
                        <div class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-xs flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 last:border-0" onclick="setStnValue('${input.id}', '${s.station_code}')">
                            <span class="font-bold text-[#8e1b29] dark:text-red-400 font-mono">${s.station_code}</span>
                            <span class="text-gray-600 dark:text-gray-300 font-medium">${formatStationName(s.station_name)}</span>
                        </div>`).join('');
                    dropdown.classList.remove('hidden');
                    return;
                }
            } catch (e) {
                console.warn('Station search error:', e);
            }
            dropdown.classList.add('hidden');
        }, 220);
    });
}

function setStnValue(inputId, code) {
    const el = document.getElementById(inputId);
    if (el) el.value = code;
    if (elements.stnFromDropdown) elements.stnFromDropdown.classList.add('hidden');
    if (elements.stnToDropdown) elements.stnToDropdown.classList.add('hidden');
}

// Find Trains Between Stations using Supabase
async function findStationTrains() {
    const from = elements.stnFrom.value.toUpperCase().trim();
    const to = elements.stnTo.value.toUpperCase().trim();
    if (!from || !to) return;

        elements.stnResults.innerHTML = `
            <div class="p-6 bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center gap-3">
                <div class="w-5 h-5 border-2 border-[#8e1b29] border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs font-bold text-gray-500">${t('searching_routes').replace('{f}', from).replace('{t}', to)}</span>
            </div>`;

        try {
            const [rFrom, rTo] = await Promise.all([
                supabaseFetch(`train_schedule?station_code=eq.${from}&select=train_no,station_no,departure_time,arrival_time`),
                supabaseFetch(`train_schedule?station_code=eq.${to}&select=train_no,station_no,departure_time,arrival_time`)
            ]);

            const toMap = new Map(rTo.map(x => [x.train_no, x]));
            const matches = [];
            const seenTrains = new Set();

            for (const f of rFrom) {
                const tTrain = toMap.get(f.train_no);
                if (tTrain && f.station_no < tTrain.station_no && !seenTrains.has(f.train_no)) {
                    seenTrains.add(f.train_no);
                    matches.push({
                        train_no: f.train_no,
                        depTime: f.departure_time || f.arrival_time || '--:--',
                        arrTime: tTrain.arrival_time || tTrain.departure_time || '--:--'
                    });
                }
            }

            if (matches.length === 0) {
                elements.stnResults.innerHTML = `
                    <div class="p-8 text-center bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-2xl">
                        <span class="material-symbols-outlined text-4xl text-gray-400 mb-2">alt_route</span>
                        <p class="text-sm font-bold text-[#0f172a] dark:text-white">${t('no_direct_trains').replace('{f}', from).replace('{t}', to)}</p>
                        <p class="text-xs text-gray-500 mt-1">${t('check_stations')}</p>
                    </div>`;
                return;
            }

            const trainNos = matches.slice(0, 10).map(m => m.train_no);
            const liveDetails = await supabaseFetch(`live_trains?train_no=in.(${trainNos.join(',')})&select=train_no,train_name,type_code,adjusted_delay`);
            const liveMap = new Map(liveDetails.map(d => [d.train_no, d]));

            elements.stnResults.innerHTML = matches.slice(0, 10).map(m => {
                const detail = liveMap.get(m.train_no);
                const trainName = detail ? formatTrainName(detail.train_name) : `TRAIN ${m.train_no}`;
                const delay = detail ? Math.round(detail.adjusted_delay || 0) : 0;
                const delayBadge = delay > 0 
                    ? `<span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-[#c2410c] dark:text-amber-300 font-mono text-[10px] font-bold rounded-full">+${delay}m ${t('late_short')}</span>`
                    : `<span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-mono text-[10px] font-bold rounded-full">${t('ontime')}</span>`;

                return `
                    <div class="bg-white dark:bg-[#181e29] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs flex items-center justify-between hover:border-[#8e1b29] cursor-pointer transition-all" onclick="selectTrain('${m.train_no}'); switchTab('spot-your-train');">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-xs font-bold text-[#8e1b29] dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded">${m.train_no}</span>
                                <h4 class="font-bold text-[#0f172a] dark:text-white text-sm">${trainName}</h4>
                                ${delayBadge}
                            </div>
                            <div class="flex items-center gap-3 text-xs text-gray-500 font-mono mt-2">
                                <span>${t('departs')} ${from}: <strong class="text-[#0f172a] dark:text-white">${m.depTime}</strong></span>
                                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                                <span>${t('arrives')} ${to}: <strong class="text-[#0f172a] dark:text-white">${m.arrTime}</strong></span>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>`;
            }).join('');

        } catch (err) {
            console.warn('Error during station-to-station query:', err);
            elements.stnResults.innerHTML = `
                <div class="p-6 text-center text-xs text-rose-500 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200">
                    Failed to query trains between ${from} and ${to}. Please try again shortly.
                </div>`;
        }
}

// Refresh / Sync Live Data
async function triggerSync() {
    const icon = document.getElementById('syncIcon');
    if (icon) icon.classList.add('animate-spin');

    const t0 = performance.now();
    if (state.selectedTrain) {
        await selectTrain(state.selectedTrain.no);
    }
    await loadSuggestedTrains();
    const latency = Math.round(performance.now() - t0);

    if (icon) icon.classList.remove('animate-spin');

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lastSyncLabel = document.getElementById('lastSyncLabel');
    if (lastSyncLabel) lastSyncLabel.innerText = `${t('last_updated')}: ${timeStr} IST`;
    
    const latencyEl = document.getElementById('pollLatency');
    if (latencyEl) latencyEl.innerText = `${latency}ms`;
}

// Live Header Clock
function updateLiveDisplays() {
    const now = new Date();
    const use12h = state.timeFormat === '12';
    const timeOptions = {
        hour12: use12h,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Kolkata'
    };
    const timeStr = now.toLocaleTimeString(use12h ? 'en-US' : 'en-GB', timeOptions);
    const clockEl = document.getElementById('liveHeaderClock');
    if (clockEl) {
        clockEl.innerText = timeStr + ' IST';
    }
    const dateEl = document.getElementById('liveDateStr');
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString(state.lang, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    }
}

// Export functions to window for HTML onclick attributes
window.selectTrain = selectTrain;
window.switchTab = switchTab;
window.setStnValue = setStnValue;
window.refreshCurrentTrain = () => triggerSync();
window.openWelcomeModal = openWelcomeModal;
window.closeWelcomeModal = closeWelcomeModal;
window.copyShareableLink = copyShareableLink;

// Start on DOM ready
document.addEventListener('DOMContentLoaded', init);
