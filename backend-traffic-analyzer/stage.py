# train_model.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.utils import to_categorical
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os

# Load and preprocess data
df = pd.read_csv('Darknet.csv') 
print(df.shape)
print(df.head())

# Drop unnecessary or identifier columns
drop_cols = ["Flow ID", "Src IP", "Dst IP", "Timestamp", "Label.1"]
df.drop(columns=drop_cols, errors="ignore", inplace=True)

# Drop rows with missing or infinite values
df.replace([np.inf, -np.inf], pd.NA, inplace=True)
df.dropna(inplace=True)

# Encode non-numeric features
non_numeric_cols = df.select_dtypes(include=['object']).columns.drop('Label')  # Exclude label
for col in non_numeric_cols:
    df[col] = LabelEncoder().fit_transform(df[col])

# Label encoding for multi-class target
le = LabelEncoder()
y = le.fit_transform(df["Label"])
print("Label mapping:", dict(zip(le.classes_, le.transform(le.classes_))))

# One-hot encode the label for multi-class classification
y_categorical = to_categorical(y)

# Prepare feature matrix
X = df.drop(columns=["Label"])
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_categorical, test_size=0.3, random_state=42)

# Reshape for LSTM [samples, time steps, features]
X_train_lstm = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
X_test_lstm = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))

# Build LSTM model
model = Sequential()
model.add(LSTM(64, input_shape=(1, X_train.shape[1]), return_sequences=True))
model.add(Dropout(0.2))
model.add(LSTM(32))
model.add(Dropout(0.2))
model.add(Dense(y_categorical.shape[1], activation='softmax'))

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.summary()

# Train model
model.fit(X_train_lstm, y_train, epochs=10, batch_size=64, validation_data=(X_test_lstm, y_test))

# Evaluate the model
y_pred = np.argmax(model.predict(X_test_lstm), axis=1)
y_true = np.argmax(y_test, axis=1)

# Evaluate
print(confusion_matrix(y_true, y_pred))
print(classification_report(y_true, y_pred, target_names=le.classes_))

# Create model directory if it doesn't exist
os.makedirs("model", exist_ok=True)

# Save the LSTM model
model.save("model/traffic_classifier_model.h5")

# Save the scaler MinMaxScaler
joblib.dump(scaler, "model/scaler.pkl")

# Save the LabelEncoder
joblib.dump(le, "model/label_encoder.pkl")

print("✅ Model, scaler and label encoder saved successfully in the 'model/' folder")