from supabase import create_client, Client
from PicToGemini import createJSON, base64Trans
from dotenv import load_dotenv
from PIL import Image
import os

url = "https://ccmmvivuqonrkvddcmwv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjbW12aXZ1cW9ucmt2ZGRjbXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODM2NDIsImV4cCI6MjA4ODQ1OTY0Mn0.1beYKNuxka-Vz8uGpXGt0Gx9cm_b6j7clICvtRGdQdQ"

supabase: Client = create_client(url, key)

def addCircuit(user_id: str, title: str, short_description: str, arduino_code: str, image_url: str, circuit_json: dict):
    res = supabase.table("circuit_posts").insert({
        "user_id": user_id,
        "title": title,
        "short_description": short_description,
        "arduino_code": arduino_code,
        "image_url": image_url,
        "circuit_json": circuit_json
    }).execute()
    return res.data[0] if res.data else None

    
script_dir = os.path.dirname(os.path.abspath(__file__))
image = Image.open(os.path.join(script_dir, "IMG_5937.jpg"))

addCircuit('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'What is wrong with this', "I have been troubleshooting this and have given up", 'x=5\ny=5', 'xyz.com', createJSON(base64Trans(image)))