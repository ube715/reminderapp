from index import app

if __name__ == '__main__':
    # Use 0.0.0.0 so Expo web can reach API if needed via localhost
    app.run(host='0.0.0.0', port=5000, debug=True)
