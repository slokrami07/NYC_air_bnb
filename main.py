from fastapi import FastAPI
import pandas as pd
from pydantic import BaseModel, Field
import joblib
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COLUMNS = ["latitude", "longitude", "price", "minimum_nights",
    "number_of_reviews", "reviews_per_month",
    "calculated_host_listings_count", "availability_365",
    "neighbourhood_group", "neighbourhood",]

model = joblib.load("Model_Pipeline.pkl")

# pydantic model:
class features(BaseModel):
    latitude : float = Field(..., ge=-90, le=90, description="latitude of the location")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    price: float = Field(..., gt=0, description="Price per night, must be positive")
    minimum_nights: int = Field(..., ge=1, le=365, description="Minimum nights required for booking")
    number_of_reviews: int = Field(..., ge=0, description="Total number of reviews")
    reviews_per_month: float = Field(..., ge=0, description="Average reviews per month")
    calculated_host_listings_count: int = Field(..., ge=0, description="Number of listings by this host")
    availability_365: int = Field(..., ge=0, le=365, description="Days available out of 365")
    neighbourhood_group: str = Field(..., min_length=1, description="Borough or neighbourhood group")
    neighbourhood: str = Field(..., min_length=1, description="Specific neighbourhood name")

import os
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import Request

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get('/app')
def serve_app():
    return FileResponse("index.html")

@app.get('/greet')
def greet_endpoint():
    return "hellooo guysss!!"

@app.get('/')
def greet(request: Request = None):
    # If opened in a web browser, serve the interactive UI
    if request and "text/html" in request.headers.get("accept", ""):
        if os.path.exists("index.html"):
            return FileResponse("index.html")
    return "hellooo guysss!!"

@app.post('/predict')
def predict(features : features):
    row = pd.DataFrame([features.dict()], columns=COLUMNS, index = [0])
    prediction = model.predict(row)
    probability = model.predict_proba(row)

    return {"predicted_room_type": prediction[0],
    "probability":probability.tolist()[0]}

