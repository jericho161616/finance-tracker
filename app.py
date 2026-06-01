import streamlit as st
import pandas as pd
import database 
import datetime
import calendar
import re

database.create_table()

st.set_page_config(page_title="Finance Tracker", page_icon="💰", layout="wide")

today = datetime.date.today()

# Initialize dynamic session login states
if "app_authenticated" not in st.session_state:
    st.session_state.app_authenticated = False

# -----------------------------------------
# INTERCEPTOR LEVEL 1: SETUP COMPLIANCE
# -----------------------------------------
user_profile = database.get_user_profile()

if user_profile is None:
    st.title("🚀 Welcome to Your Finance Tracker Setup")
    st.subheader("Let's configure your secure profile and financial cycles.")
    
    col_u1, col_u2 = st.columns(2)
    with col_u1:
        nickname = st.text_input("👤 What is your nickname?", placeholder="e.g., Mac")
    with col_u2:
        custom_password = st.text_input("🔑 Create your access password:", type="password", placeholder="Keep this secure!")
        
    st.markdown("---")
    st.markdown("### 💳 Configure Your Credit Cards")
    st.write("Add your credit cards below. You can configure individual rules for each card.")
    
    if "wizard_card_count" not in st.session_state:
        st.session_state.wizard_card_count = 1
        
    cards_input_data = []
    
    for i in range(st.session_state.wizard_card_count):
        with st.container(border=True):
            st.markdown(f"**Card Account #{i+1}**")
            c_col1, c_col2, c_col3, c_col4 = st.columns(4)
            with c_col1:
                b_name = st.text_input(f"Bank Name", key=f"bank_name_{i}", placeholder="e.g., BPI, Maya")
            with c_col2:
                b_limit = st.number_input(f"Credit Limit (₱)", min_value=0, value=50000, step=5000, key=f"limit_{i}")
            with c_col3:
                b_day = st.number_input(f"Statement Cutoff Day", min_value=1, max_value=31, value=16, key=f"day_{i}")
            with c_col4:
                b_grace = st.number_input(f"Grace Period (Days)", min_value=1, max_value=45, value=20, key=f"grace_{i}")
                
            sample_statement = datetime.date(today.year, today.month, int(b_day))
            sample_due = sample_statement + datetime.timedelta(days=int(b_grace))
            st.caption(f"💡 *{b_name if b_name else 'This card'}* cycle: Swipes from the **{b_day}th** are due around **{sample_due.strftime('%B %d')}**.")
            
            if b_name.strip():
                cards_input_data.append({
                    "bank_name": b_name.strip(),
                    "credit_limit": float(b_limit),
                    "statement_day": int(b_day),
                    "grace_period": int(b_grace)
                })

    btn_l, btn_r = st.columns([1, 4])
    if btn_l.button("➕ Add Another Credit Card"):
        st.session_state.wizard_card_count += 1
        st.rerun()
        
    st.markdown("---")
    if st.button("Complete Setup & Boot Tracker", type="primary", use_container_width=True):
        if not nickname.strip():
            st.error("Please provide a nickname.")
        elif not custom_password.strip():
            st.error("Please provide an access password for your lock screen.")
        elif not cards_input_data:
            st.error("Please add at least one valid credit card configuration.")
        else:
            database.save_user_profile(nickname.strip(), custom_password.strip(), cards_input_data)
            st.success("Account profile built! Loading tracker...")
            st.rerun()
    st.stop()

# -----------------------------------------
# INTERCEPTOR LEVEL 2: LOCK GATE SCREEN
# -----------------------------------------
user_name = user_profile["nickname"]
secure_pin = user_profile["password"]
user_cards = user_profile["cards"]
card_options_list = [c["bank_name"] for c in user_cards]

if not st.session_state.app_authenticated:
    st.markdown("<br/><br/>", unsafe_allow_html=True)
    login_center_col1, login_center_col2, login_center_col3 = st.columns([1, 2, 1])
    
    with login_center_col2:
        with st.container(border=True):
            st.title(f"🔓 Hello, {user_name}! 👋")
            st.markdown("Your **Finance Tracker** is currently locked. Enter your password to access your ledgers.")
            st.divider()
            
            entered_pin = st.text_input("Enter Profile Password:", type="password", placeholder="••••••••")
            
            if st.button("Unlock Terminal Workspace", type="primary", use_container_width=True):
                if entered_pin == secure_pin:
                    st.session_state.app_authenticated = True
                    st.success("Access Granted! Opening ledger dashboard...")
                    st.rerun()
                else:
                    st.error("Access Denied: Invalid credentials provided.")
    st.stop() # Freeze rendering immediately here if login gate hasn't passed!

# -----------------------------------------
# MAIN ACTIVE WORKSPACE RESUME
# -----------------------------------------
if "card_limits" not in st.session_state:
    st.session_state.card_limits = {c["bank_name"]: c["credit_limit"] for c in user_cards}

title_col, toggle_col = st.columns([4, 1])
with title_col:
    st.title(f"Hi, {user_name}! 👋")
with toggle_col:
    privacy_mode = st.toggle("🔒 Privacy Mode", value=False, key="main_privacy_toggle")

# -----------------------------------------
# SYSTEM MODALS
# -----------------------------------------
@st.dialog("🔒 Admin Authorization Required")
def confirm_monthly_wipe(month_label, year_label, cc_s, cc_e, std_s, std_e):
    st.error(f"⚠️ You are about to wipe data for **{month_label} {year_label}**.")
    password_input = st.text_input("Enter Your Account Password:", type="password")
    col1, col2 = st.columns(2)
    if col1.button("Authorize Wipe", type="primary"):
        # MATCHING VERIFICATION: Checks against the user's setup database entry!
        if password_input == secure_pin:
            database.delete_monthly_expenses(cc_s.strftime("%Y-%m-%d"), cc_e.strftime("%Y-%m-%d"), std_s.strftime("%Y-%m-%d"), std_e.strftime("%Y-%m-%d"))
            st.success("Month data cleared successfully!")
            st.rerun()
        else: 
            st.error("Access Denied: Incorrect Profile Password.")
    if col2.button("Cancel"): st.rerun()

@st.dialog("Confirm Deletion")
def confirm_delete(entry_id, is_income=False):
    st.warning("Are you sure you want to permanently delete this entry?")
    col1, col2 = st.columns(2)
    if col1.button("Yes, Delete", type="primary"):
        if is_income: database.delete_income(entry_id)
        else: database.delete_expense(entry_id)
        st.rerun()
    if col2.button("Cancel"): st.rerun()

@st.dialog("Edit Expense")
def edit_expense(row):
    st.write(f"Editing Transaction {row['ID']}")
    edit_date = st.date_input("Date", pd.to_datetime(row["Date"]).date())
    edit_amount = st.number_input("Amount (₱)", min_value=0, value=int(abs(row["Amount"])), step=100)
    edit_category = st.selectbox("Category", ["Food", "Utilities", "Transport", "Shopping", "Entertainment", "Credit Card Payment", "Other"])
    edit_desc = st.text_input("Description", value=row["Description"])
    if st.button("Save Changes"):
        database.update_expense(row["ID"], edit_date.strftime("%Y-%m-%d"), float(edit_amount), edit_category, row["Account Type"], edit_desc)
        st.rerun()

# -----------------------------------------
# SIDEBAR NAVIGATION CONTROLLERS
# -----------------------------------------
st.sidebar.markdown("### 📅 Filter Dashboard")

month_names_map = {i: calendar.month_name[i] for i in range(1, 13)}
year_options_list = list(range(today.year - 2, today.year + 3))

side_col1, side_col2 = st.sidebar.columns(2)

with side_col1:
    fallback_month_name = st.session_state.get("active_month_name", month_names_map[today.month])
    saved_month_idx = list(month_names_map.values()).index(fallback_month_name)
    selected_month_name = st.selectbox("Select Month", list(month_names_map.values()), index=saved_month_idx, key="m_sel")
    st.session_state.active_month_name = selected_month_name
    selected_month = list(month_names_map.keys())[list(month_names_map.values()).index(selected_month_name)]

with side_col2:
    fallback_year_val = st.session_state.get("active_year_val", today.year)
    saved_year_idx = year_options_list.index(fallback_year_val)
    selected_year = st.selectbox("Select Year", year_options_list, index=saved_year_idx, key="y_sel")
    st.session_state.active_year_val = selected_year

std_start = datetime.date(selected_year, selected_month, 1)
std_end = datetime.date(selected_year, selected_month, calendar.monthrange(selected_year, selected_month)[1])

if user_cards and len(user_cards) > 0:
    primary_stmt_day = int(user_cards[0]["statement_day"])
else:
    primary_stmt_day = 16

cc_start = datetime.date(selected_year, selected_month, primary_stmt_day)
if selected_month == 12:
    cc_end = datetime.date(selected_year + 1, 1, primary_stmt_day - 1)
else:
    cc_end = datetime.date(selected_year, selected_month + 1, primary_stmt_day - 1)

st.sidebar.divider()
entry_mode = st.sidebar.radio("Transaction Type:", ["Expense 🟥", "Money Gain 🟩", "Pay Credit Card 💳"])
st.sidebar.markdown("---")

# -----------------------------------------
# PRIVACY PARSER UTILITY HELPER
# -----------------------------------------
def fmt_amt(val, prefix="₱"):
    if privacy_mode: return f"{prefix} ****"
    return f"{prefix}{val:,.2f}"

# -----------------------------------------
# TRANSACTION PROCESSORS
# -----------------------------------------
if entry_mode == "Expense 🟥":
    st.sidebar.header("Add New Expense")
    expense_date = st.sidebar.date_input("Date")
    expense_amount = st.sidebar.number_input("Amount (₱)", min_value=0, step=100)
    expense_category = st.sidebar.selectbox("Category", ["Food", "Utilities", "Transport", "Shopping", "Entertainment", "Other"])
    account_type = st.sidebar.selectbox("Account Type", ["Credit Card", "Savings Card", "Cash"])
    
    final_card_string = "Cash"
    if account_type == "Credit Card":
        chosen_cc = st.sidebar.selectbox("Which Card?", card_options_list + ["Other"])
        final_card_string = f"Credit Card ({chosen_cc})"
    elif account_type == "Savings Card":
        chosen_sav = st.sidebar.selectbox("Which Savings?", ["UnionBank", "BPI", "Maya", "Gcash", "Other"])
        final_card_string = f"Savings Card ({chosen_sav})"
        
    expense_desc = st.sidebar.text_input("Description (Optional)")
    if st.sidebar.button("Log Expense", type="primary"):
        database.add_expense(expense_date.strftime("%Y-%m-%d"), float(expense_amount), expense_category, final_card_string, expense_desc)
        st.sidebar.success("Logged!")
        st.rerun()

elif entry_mode == "Money Gain 🟩":
    st.sidebar.header("Log Incoming Money")
    inc_date = st.sidebar.date_input("Date")
    inc_amount = st.sidebar.number_input("Amount Received (₱)", min_value=0, value=50000, step=100)
    inc_source = st.sidebar.selectbox("Source", ["Salary", "Business", "Freelance", "Other"])
    chosen_sav = st.sidebar.selectbox("Deposit To Account", ["UnionBank", "BPI", "Maya", "Gcash", "Other"])
    if st.sidebar.button("Log Money Gain", type="primary"):
        database.add_income(inc_date.strftime("%Y-%m-%d"), float(inc_amount), inc_source, f"Savings Card ({chosen_sav})", "")
        st.sidebar.success("Income logged!")
        st.rerun()
else:
    st.sidebar.header("Record Bill Payment")
    pay_date = st.sidebar.date_input("Payment Date")
    pay_amount = st.sidebar.number_input("Amount Paid (₱)", min_value=0, step=100)
    pay_card = st.sidebar.selectbox("To Which Card?", card_options_list)
    
    matched_card_meta = next((c for c in user_cards if c["bank_name"] == pay_card), user_cards[0])
    c_cutoff = matched_card_meta["statement_day"]
    
    if st.sidebar.button("Log Payment", type="primary"):
        if 1 <= pay_date.day <= 5:
            target_date = datetime.date(pay_date.year, pay_date.month - 1, c_cutoff) if pay_date.month > 1 else datetime.date(pay_date.year - 1, 12, c_cutoff)
        else:
            target_date = datetime.date(pay_date.year, pay_date.month, c_cutoff)
        database.pay_credit_card(target_date.strftime("%Y-%m-%d"), float(pay_amount), pay_card, "Automated Bill Payment")
        st.sidebar.success("Payment processed!")
        st.rerun()

# --- LOWER SIDEBAR POSITIONED ADMIN WIPE BUTTON ---
st.sidebar.markdown("<br/><br/>", unsafe_allow_html=True)
st.sidebar.divider()
if st.sidebar.button("🗑️ Clear Filtered Month", use_container_width=True):
    confirm_monthly_wipe(selected_month_name, selected_year, cc_start, cc_end, std_start, std_end)

# -----------------------------------------
# TABLE COMPONENT BUILDER
# -----------------------------------------
def render_custom_table(filtered_df, tab_prefix, is_income=False):
    if filtered_df.empty:
        st.info("No records found.")
        return
    for index, row in filtered_df.iterrows():
        with st.container(border=True):
            r_col1, r_col2, r_col3, r_col4, r_col5 = st.columns((1.5, 2.5, 3.5, 4.5, 1.5))
            r_col1.write(f"📅 {row['Date']}")
            if not is_income and row["Category"] == "Credit Card Payment":
                r_col2.markdown(f"<span style='color:#2ecc71; font-weight:bold;'>+{fmt_amt(abs(row['Amount']))}</span>", unsafe_allow_html=True)
            elif is_income:
                r_col2.markdown(f"<span style='color:#2ecc71; font-weight:bold;'>{fmt_amt(row['Amount'])}</span>", unsafe_allow_html=True)
            else:
                r_col2.markdown(f"<span style='color:#ff4b4b; font-weight:bold;'>{fmt_amt(row['Amount'])}</span>", unsafe_allow_html=True)
            r_col3.write(f"🏷️ `{row['Category'] if not is_income else row['Source']}`")
            r_col4.write(f"💳 **{row['Account Type']}** — *{row['Description']}*")
            with r_col5:
                act_l, act_r = st.columns(2)
                if act_l.button("✏️", key=f"ed_{tab_prefix}_{row['ID']}", use_container_width=True): edit_expense(row)
                if act_r.button("❌", key=f"del_{tab_prefix}_{row['ID']}", use_container_width=True): confirm_delete(row['ID'], is_income)

# -----------------------------------------
# DATA PIPELINE COMPILER CORE
# -----------------------------------------
exp_raw = database.get_all_expenses()
exp_df = pd.DataFrame(exp_raw, columns=["ID", "Date", "Amount", "Category", "Account Type", "Description"])

if not exp_df.empty:
    exp_df['DateObj'] = pd.to_datetime(exp_df['Date']).dt.date
    exp_df['Base Type'] = exp_df['Account Type'].apply(lambda x: x.split(' (')[0] if '(' in x else x)
    exp_df['BankKey'] = exp_df['Account Type'].apply(lambda x: x.split('(')[1].split(')')[0] if '(' in x else 'Other')
    
    combined_cc_mask = pd.Series(False, index=exp_df.index)
    for card in user_cards:
        c_day = card["statement_day"]
        c_start = datetime.date(selected_year, selected_month, c_day)
        c_end = datetime.date(selected_year + 1, 1, c_day - 1) if selected_month == 12 else datetime.date(selected_year, selected_month + 1, c_day - 1)
        card_mask = (exp_df['Base Type'] == 'Credit Card') & (exp_df['BankKey'] == card["bank_name"]) & (exp_df['DateObj'] >= c_start) & (exp_df['DateObj'] <= c_end)
        combined_cc_mask = combined_cc_mask | card_mask
    filtered_exp = exp_df[combined_cc_mask | ((exp_df['Base Type'] != 'Credit Card') & (exp_df['DateObj'] >= std_start) & (exp_df['DateObj'] <= std_end))]
else:
    filtered_exp = exp_df

inc_raw = database.get_all_income()
inc_df = pd.DataFrame(inc_raw, columns=["ID", "Date", "Amount", "Source", "Account Type", "Description"])
if not inc_df.empty:
    inc_df['DateObj'] = pd.to_datetime(inc_df['Date']).dt.date
    filtered_inc = inc_df[(inc_df['DateObj'] >= std_start) & (inc_df['DateObj'] <= std_end)]
else:
    filtered_inc = inc_df

# Display Statement Info
date_grid_l, date_grid_r = st.columns(2)
date_grid_l.caption("💳 ACTIVE SYSTEM TIMELINE CUTOFF MAP (PRIMARY)")
date_grid_l.markdown(f"**{cc_start.strftime('%b %d, %Y')}** to **{cc_end.strftime('%b %d, %Y')}**")
date_grid_r.caption("🏦 SAVINGS & CASH CALENDAR METRICS INTERVAL")
date_grid_r.markdown(f"**{std_start.strftime('%b %d, %Y')}** to **{std_end.strftime('%b %d, %Y')}**")

st.divider()

# -----------------------------------------
# VIEWS INTERFACE RENDERING
# -----------------------------------------
tab_overview, tab_cc, tab_savings, tab_cash, tab_income = st.tabs(["📊 Overview Matrix", "💳 Dynamic Credit Cards", "🏦 Savings Logs", "💵 Cash Logs", "📈 Money Gains"])

with tab_overview:
    t_exp = filtered_exp['Amount'].sum() if not filtered_exp.empty else 0.0
    t_inc = filtered_inc['Amount'].sum() if not filtered_inc.empty else 0.0
    
    st.markdown("### 📈 Dashboard Summary")
    h1, h2, h3 = st.columns(3)
    h1.metric("Total Money Gains", fmt_amt(t_inc))
    h2.metric("Overall Expenses", fmt_amt(t_exp))
    h3.metric("Net Remaining Balance", fmt_amt(t_inc - t_exp))
    st.divider()
    
    if not filtered_exp.empty:
        v_col1, v_col2 = st.columns([1.5, 1])
        with v_col1:
            st.markdown("#### 📊 Expenses by Category")
            chart_df = filtered_exp[filtered_exp['Category'] != "Credit Card Payment"]
            if not chart_df.empty:
                if privacy_mode: st.info("📊 Charts are temporarily disabled while Privacy Mode is running.")
                else: st.bar_chart(chart_df.groupby('Category')['Amount'].sum().reset_index(), x="Category", y="Amount", color="Category", use_container_width=True)
        with v_col2:
            st.markdown("#### 🔍 Summary Matrix")
            matrix_df = filtered_exp[filtered_exp['Category'] != "Credit Card Payment"]
            if not matrix_df.empty:
                sum_grouped = matrix_df.groupby(['Base Type', 'Category'])['Amount'].sum().reset_index()
                if privacy_mode: sum_grouped['Amount'] = "₱ ****"
                else: sum_grouped['Amount'] = sum_grouped['Amount'].apply(lambda x: f"₱{x:,.2f}")
                st.dataframe(sum_grouped, use_container_width=True, hide_index=True)
    
    st.markdown("#### Recent Operations Feed")
    render_custom_table(filtered_exp, "overview_all")

with tab_cc:
    st.subheader("Your Dynamic Credit Accounts")
    cc_sub_df = filtered_exp[filtered_exp['Base Type'] == 'Credit Card'] if not filtered_exp.empty else pd.DataFrame()
    
    # -------------------------------------------------------------
    # ⚙️ NEW CARD CONFIGURATION MODIFIER ENGINE
    # -------------------------------------------------------------
    with st.expander("⚙️ Manage Card Settings & Parameters", expanded=False):
        st.markdown("Select a card to adjust its Credit Limit, Statement Cutoff Day, or Grace Period:")
        target_edit_bank = st.selectbox("Choose Card to Modify:", card_options_list)
        
        # Pull current config specs for selected card to use as form defaults
        matched_card = next((c for c in user_cards if c["bank_name"] == target_edit_bank), None)
        
        if matched_card:
            ec1, ec2, ec3 = st.columns(3)
            with ec1:
                new_limit = st.number_input(f"New Limit for {target_edit_bank} (₱)", min_value=0, value=int(matched_card["credit_limit"]), step=5000)
            with ec2:
                new_day = st.number_input(f"New Statement Cutoff Day", min_value=1, max_value=31, value=int(matched_card["statement_day"]))
            with ec3:
                new_grace = st.number_input(f"New Grace Period (Days)", min_value=1, max_value=45, value=int(matched_card["grace_period"]))
                
            if st.button(f"Save Changes for {target_edit_bank}", type="primary"):
                database.update_user_card(target_edit_bank, float(new_limit), int(new_day), int(new_grace))
                st.success(f"Successfully updated parameters for {target_edit_bank}!")
                st.rerun()
                
    st.divider()
    
    # Render individual credit card logs loop
    for card in user_cards:
        card_name = card["bank_name"]
        spec_df = cc_sub_df[cc_sub_df['BankKey'] == card_name] if not cc_sub_df.empty else pd.DataFrame()
        spend = spec_df['Amount'].sum() if not spec_df.empty else 0.0
        limit = card["credit_limit"]
        
        c_day = card["statement_day"]
        due_date_obj = datetime.date(selected_year, selected_month, c_day) + datetime.timedelta(days=card["grace_period"])
        
        head_l, head_r = st.columns([3, 1])
        head_l.markdown(f"### 💳 Card Account: **{card_name}**")
        head_r.markdown(f"<div style='background-color:#ff4b4b22; border:1px solid #ff4b4b; border-radius:6px; padding:4px 10px; color:#ff4b4b; font-weight:bold; font-size:13px; text-align:center; margin-top:8px;'>⚠️ Pay before: {due_date_obj.strftime('%b %d, %Y')}</div>", unsafe_allow_html=True)
        
        sc1, sc2, sc3 = st.columns(3)
        sc1.metric("Current Balance Owed", fmt_amt(spend))
        sc2.metric("Assigned Max Limit", fmt_amt(limit))
        sc3.metric("Available Spending Limit", fmt_amt(limit - spend))
        
        render_custom_table(spec_df, f"tab_cc_{card_name}")
        st.divider()

with tab_savings:
    st.subheader("Savings Withdrawal Operations")
    sav_df = filtered_exp[filtered_exp['Base Type'] == 'Savings Card'] if not filtered_exp.empty else pd.DataFrame()
    render_custom_table(sav_df, "tab_sav")

with tab_cash:
    st.subheader("Cash Ledger Entries")
    csh_df = filtered_exp[filtered_exp['Base Type'] == 'Cash'] if not filtered_exp.empty else pd.DataFrame()
    render_custom_table(csh_df, "tab_csh")

with tab_income:
    st.subheader("Incoming Revenue Logs")
    render_custom_table(filtered_inc, "tab_inc", is_income=True)