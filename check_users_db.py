import psycopg2
import sys

def main():
    conn = psycopg2.connect('postgresql://orbedb_owner:M25JkivKjSow@ep-lively-wildflower-a4unot9k.us-east-1.aws.neon.tech/orbedb?sslmode=require')
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users';")
    cols = [row[0] for row in cur.fetchall()]
    print("USERS COLUMNS:", cols)

if __name__ == "__main__":
    main()
