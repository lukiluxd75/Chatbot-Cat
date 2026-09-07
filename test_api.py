import requests

url = "http://localhost:8000/api/chat"
payload = {
    "session_id": "test_session",
    "messages": [
        {"role": "user", "content": "hola"}
    ]
}

try:
    response = requests.post(url, json=payload)
    print("STATUS:", response.status_code)
    print("BODY:", response.text)
except Exception as e:
    print("Error:", e)
