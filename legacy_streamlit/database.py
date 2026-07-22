import sqlite3

def create_connection():
    return sqlite3.connect("finance_v2.db")

def create_table():
    conn = create_connection()
    cursor = conn.cursor()
    
    # Updated to store the custom user password securely
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT,
            password TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_name TEXT,
            credit_limit REAL,
            statement_day INTEGER,
            grace_period INTEGER
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            amount REAL,
            category TEXT,
            account_type TEXT,
            description TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            amount REAL,
            source TEXT,
            account_type TEXT,
            description TEXT
        )
    ''')
    conn.commit()
    conn.close()

def get_user_profile():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nickname, password FROM user_profile LIMIT 1")
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
        
    nickname = row[0]
    password = row[1]
    
    cursor.execute("SELECT bank_name, credit_limit, statement_day, grace_period FROM user_cards")
    cards = cursor.fetchall()
    conn.close()
    
    cards_list = []
    for c in cards:
        cards_list.append({
            "bank_name": c[0],
            "credit_limit": c[1],
            "statement_day": c[2],
            "grace_period": c[3]
        })
        
    return {"nickname": nickname, "password": password, "cards": cards_list}

def save_user_profile(nickname, password, cards_list):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_profile")
    cursor.execute("DELETE FROM user_cards")
    
    # Save the dynamic nickname and custom password text
    cursor.execute("INSERT INTO user_profile (nickname, password) VALUES (?, ?)", (nickname, password))
    for c in cards_list:
        cursor.execute('''
            INSERT INTO user_cards (bank_name, credit_limit, statement_day, grace_period)
            VALUES (?, ?, ?, ?)
        ''', (c["bank_name"], c["credit_limit"], c["statement_day"], c["grace_period"]))
        
    conn.commit()
    conn.close()

# --- TRANSACTION REPOSITORIES ---
def add_expense(date, amount, category, account_type, description):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO expenses (date, amount, category, account_type, description) VALUES (?, ?, ?, ?, ?)", (date, amount, category, account_type, description))
    conn.commit()
    conn.close()

def pay_credit_card(date, amount, card_name, description=""):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO expenses (date, amount, category, account_type, description) VALUES (?, ?, 'Credit Card Payment', ?, ?)", (date, -abs(amount), f"Credit Card ({card_name})", description))
    conn.commit()
    conn.close()

def add_income(date, amount, source, account_type, description):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO income (date, amount, source, account_type, description) VALUES (?, ?, ?, ?, ?)", (date, amount, source, account_type, description))
    conn.commit()
    conn.close()

def get_all_expenses():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, date, amount, category, account_type, description FROM expenses")
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_all_income():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, date, amount, source, account_type, description FROM income")
    rows = cursor.fetchall()
    conn.close()
    return rows

def delete_expense(entry_id):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()

def delete_income(entry_id):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM income WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()

def update_expense(entry_id, date, amount, category, account_type, description):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE expenses SET date=?, amount=?, category=?, account_type=?, description=? WHERE id=?", (date, amount, category, account_type, description, entry_id))
    conn.commit()
    conn.close()

def update_income(entry_id, date, amount, source, account_type, description):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE income SET date=?, amount=?, source=?, account_type=?, description=? WHERE id=?", (date, amount, source, account_type, description, entry_id))
    conn.commit()
    conn.close()

def delete_monthly_expenses(cc_start, cc_end, std_start, std_end):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE (category != 'Credit Card Payment' AND date >= ? AND date <= ?) OR (category = 'Credit Card Payment') OR (account_type NOT LIKE 'Credit Card%' AND date >= ? AND date <= ?)", (cc_start, cc_end, std_start, std_end))
    cursor.execute("DELETE FROM income WHERE date >= ? AND date <= ?", (std_start, std_end))
    conn.commit()
    conn.close()

def update_user_card(bank_name, new_limit, new_day, new_grace):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE user_cards 
        SET credit_limit = ?, statement_day = ?, grace_period = ? 
        WHERE bank_name = ?
    ''', (new_limit, new_day, new_grace, bank_name))
    conn.commit()
    conn.close()