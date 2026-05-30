FROM animcogn/face_recognition:cpu

WORKDIR /app

RUN /opt/venv/bin/python3 -m pip install --upgrade pip

RUN pip install --no-cache-dir --default-timeout=600 google-api-python-client
RUN pip install --no-cache-dir --default-timeout=600 google-cloud-storage
RUN pip install --no-cache-dir --default-timeout=600 google-cloud-firestore
RUN pip install --no-cache-dir --default-timeout=600 firebase-admin

RUN pip install --no-cache-dir --default-timeout=600 fastapi "uvicorn[standard]" pillow numpy python-multipart python-dotenv

COPY main.py .
COPY risk.py .
COPY known_faces/ known_faces/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]