from flask import Flask, request, jsonify, render_template
import pickle
import numpy as np

app = Flask(__name__)

model = pickle.load(open("model/house_price_model.pkl", "rb"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    features = [
        data["med_income"],
        data["house_age"],
        data["total_rooms"],
        data["total_bedrooms"],
        data["population"],
        data["households"],
        data["latitude"],
        data["longitude"]
    ]

    prediction = model.predict([features])[0]

    return jsonify({
        "predicted_price": float(prediction)
    })

if __name__ == "__main__":
    app.run(debug=True)