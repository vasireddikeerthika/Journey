# 🚆 Journey — Dynamic Railway ETA Prediction

> An ML-powered railway monitoring and ETA prediction platform designed to provide dynamic train arrival estimates using machine learning, railway schedule data, and station-level information.

[![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge)](https://journey-ijym.vercel.app/)
[![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![LightGBM](https://img.shields.io/badge/Model-LightGBM-green?style=for-the-badge)](https://lightgbm.readthedocs.io/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

---

## 👩‍💻 My Role

### Machine Learning & ETA Prediction — Keerthika Sai Vasireddi

I was primarily responsible for the **Machine Learning and ETA prediction component** of Journey, working on the prediction pipeline from data preparation through application integration.

### My ML Contributions

- 🧹 Cleaned and prepared railway schedule and delay data
- ⚙️ Performed feature engineering
- 📊 Prepared features for model training
- 🤖 Developed and trained the **LightGBM regression model**
- 📈 Evaluated model performance using **Mean Absolute Error (MAE)**
- ⏱️ Built the ETA prediction pipeline
- 🔄 Developed the dynamic delay correction layer
- 🔌 Integrated the ML prediction workflow with the application
- 🧪 Tested and validated model predictions

### My Product Contributions

Along with my ML work, I also proposed important user-facing features for Journey:

- 🗺️ **Station-to-station train journey view** — showing a train's movement from one station to the next instead of presenting train information only as an overall record.
- 🌐 **Telugu and Hindi language support** — making the railway interface more accessible to users who prefer regional languages.
- 🔄 **Polling-based updates** — allowing the dashboard to periodically retrieve updated train information without requiring a complete manual page refresh.

---

# 📌 About Journey

Journey is a railway-focused web application that combines **Machine Learning, railway data, backend services, and an interactive dashboard** to provide dynamic ETA information.

The system goes beyond displaying only scheduled arrival times by using a machine learning model to estimate train delay and calculate an updated ETA.

### Core Workflow

```text
Railway Data
     ↓
Data Cleaning
     ↓
Feature Engineering
     ↓
LightGBM Regression Model
     ↓
Predicted Delay
     ↓
Dynamic ETA Calculation
     ↓
Supabase / Backend
     ↓
Polling
     ↓
Journey Dashboard
