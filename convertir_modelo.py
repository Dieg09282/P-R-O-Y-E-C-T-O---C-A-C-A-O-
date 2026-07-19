import tensorflow as tf

# 1. Cargar tu modelo .h5 actual
model = tf.keras.models.load_model('modelo_cacao.h5')

# 2. Inicializar el convertidor optimizado para inferencia
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# 3. Convertir el modelo
tflite_model = converter.convert()

# 4. Guardar el archivo ultraligero
with open('modelo_cacao.tflite', 'wb') as f:
    f.write(tflite_model)

print("🚀 ¡Éxito! Tu cerebro 'modelo_cacao.tflite' está listo y ligero para la nube.")