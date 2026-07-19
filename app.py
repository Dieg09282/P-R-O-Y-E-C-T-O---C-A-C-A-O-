import os
import random
from flask import Flask, render_template, request, jsonify, send_file

app = Flask(__name__)

# Intentar cargar dependencias ligeras de IA (Compatibles con Local y Cloud)
try:
    import numpy as np
    from PIL import Image
    
    # En la nube usaremos tflite_runtime, localmente usará el respaldo de tensorflow.lite
    try:
        import tflite_runtime.interpreter as tflite
    except ImportError:
        import tensorflow.lite as tflite
        
    HAS_AI_DEPENDENCIES = True
except ImportError:
    HAS_AI_DEPENDENCIES = False

MODEL_PATH = "modelo_cacao.tflite"
interpreter = None
input_details = None
output_details = None

# Inicialización del Intérprete de TFLite en la Memoria RAM
if HAS_AI_DEPENDENCIES and os.path.exists(MODEL_PATH):
    try:
        interpreter = tflite.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        print("--> [SUCCESS] Cerebro Lite (TFLite) de CacaoScan cargado con éxito para inferencia.")
    except Exception as e:
        print(f"--> [WARNING] Error al inicializar TFLite: {e}. Activando resguardo simulado.")
        interpreter = None
else:
    print("--> [INFO] Servidor iniciado en Modo de Resguardo / Simulación (Sin entorno TFLite o sin archivo .tflite).")

# CORRECCIÓN VERIFICADA: El orden nativo del entrenamiento real
CLASES_MAPEO = {
    0: 'Pudrición Negra - Phytophthora palmivora',
    1: 'Saludable',
    2: 'Barrenador - Carmenta foraseminis'
}

# Estructura Dinámica Cola. Sintaxis Aplicación
class ColaProcesamiento:
    def __init__(self):
        self.items = []
    def encolar(self, imagen):
        self.items.append(imagen)
    def desencolar(self):
        if not self.items: return None
        return self.items.pop(0)

cola_imagenes = ColaProcesamiento()

# Arreglos Lineales
historial_analisis = []

FILE_PATH = "historial.txt"
UPLOAD_FOLDER = os.path.join('static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Archivos Secuenciales Funciones de archivos. Aplicación
def guardar_registro_secuencial(registro):
    with open(FILE_PATH, "a", encoding="utf-8") as f:
        linea = f"{registro['id']}|{registro['archivo']}|{registro['diagnostico']}|{registro['confianza']}|{registro['resolucion']}\n"
        f.write(linea)

# Métodos de Ordenación
def ordenar_historial_burbuja(arreglo):
    n = len(arreglo)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arreglo[j]['confianza'] < arreglo[j + 1]['confianza']:
                arreglo[j], arreglo[j + 1] = arreglo[j + 1], arreglo[j]

@app.route('/')
def login_page():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    user_type = request.args.get('user', 'Usuario')
    return render_template('dashboard.html', user_type=user_type)

@app.route('/analizar', methods=['POST'])
def analizar():
    ruta_guardado = None
    guardar_fotos = request.form.get('guardar_fotos') == 'true'
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No se adjuntó archivo de imagen'}), 400
            
        archivo = request.files['file']
        if archivo.filename == '':
            return jsonify({'error': 'No se seleccionó ninguna imagen'}), 400

        ruta_guardado = os.path.join(UPLOAD_FOLDER, archivo.filename)
        archivo.save(ruta_guardado)

        cola_imagenes.encolar(archivo.filename)
        archivo_actual = cola_imagenes.desencolar()
        
        # Arreglos Bidimensionales
        IMG_WIDTH, IMG_HEIGHT = 224, 224
        
        recomendaciones = {
            'Barrenador - Carmenta foraseminis': [
                'Cosechar mazorcas afectadas antes de madurez para cortar ciclo.',
                'Liberar Trichogramma spp. como control biologico de huevos.',
                'Instalar trampas de feromonas a 50 m entre si.'
            ],
            'Pudrición Negra - Phytophthora palmivora': [
                'Retirar y destruir mazorcas infectadas inmediatamente.',
                'Aplicar caldo bordeles al 1 por ciento en tronco y ramas cercanas.',
                'Reducir densidad de sombra para disminuir humedad relativa.'
            ],
            'Saludable': [
                'Continuar con los monitoreos fitosanitarios quincenales preventivos.',
                'Mantener el plan de fertilizacion organica y podas oportunas.'
            ]
        }

        if interpreter is not None and HAS_AI_DEPENDENCIES:
            # Procesamiento Nativo con Pillow (Elimina la dependencia pesada de Keras en la nube)
            img = Image.open(ruta_guardado).convert('RGB')
            img = img.resize((IMG_WIDTH, IMG_HEIGHT), Image.Resampling.BILINEAR)
            img_array = np.array(img).astype(np.float32)
            
            # Preprocesamiento Matemático MobileNetV2: Escala matricial de -1 a 1 sin librerías densas
            img_array = (img_array / 127.5) - 1.0
            img_tensor = np.expand_dims(img_array, axis=0)
            
            # Ejecución de la inferencia en el intérprete TFLite
            interpreter.set_tensor(input_details[0]['index'], img_tensor)
            interpreter.invoke()
            predicciones = interpreter.get_tensor(output_details[0]['index'])
            
            indice_resultado = np.argmax(predicciones[0])
            diagnostico_final = CLASES_MAPEO[indice_resultado]
            porcentaje_confianza = round(float(predicciones[0][indice_resultado] * 100), 0)
        else:
            clases = list(CLASES_MAPEO.values())
            diagnostico_final = random.choice(clases)
            porcentaje_confianza = round(random.uniform(85.0, 99.9), 0)
        
        # Registro. Declaración y Sintaxis
        nuevo_registro = {
            'id': len(historial_analisis) + 1,
            'archivo': archivo_actual,
            'diagnostico': diagnostico_final,
            'confianza': int(porcentaje_confianza),
            'resolucion': f"{IMG_WIDTH} x {IMG_HEIGHT} px"
        }
        
        # Operaciones con Registros
        if guardar_fotos:
            guardar_registro_secuencial(nuevo_registro)
            
        # Operaciones con Arreglos
        historial_analisis.append(nuevo_registro)
        ordenar_historial_burbuja(historial_analisis)
        
        if not guardar_fotos and os.path.exists(ruta_guardado):
            os.remove(ruta_guardado)
        
        return jsonify({
            'diagnostico': diagnostico_final,
            'confianza': int(porcentaje_confianza),
            'modelo': 'MobileNetV2 TFLite Real' if interpreter else 'CNN Resguardo (Simulado)',
            'resolucion': nuevo_registro['resolucion'],
            'recomendaciones': recomendaciones[diagnostico_final],
            'historial_completo': historial_analisis
        }), 200

    except Exception as e:
        if ruta_guardado and not guardar_fotos and os.path.exists(ruta_guardado):
            os.remove(ruta_guardado)
        return jsonify({'error': f'Error en el procesamiento de matrices: {str(e)}'}), 500

@app.route('/buscar', methods=['GET'])
def buscar():
    criterio = request.args.get('query', '').lower()
    resultados_filtrados = []
    
    # Métodos de búsqueda
    for registro in historial_analisis:
        if criterio in registro['diagnostico'].lower() or criterio in registro['archivo'].lower():
            resultados_filtrados.append(registro)
            
    return jsonify({'resultados': resultados_filtrados})

@app.route('/descargar_txt')
def descargar_txt():
    if os.path.exists(FILE_PATH):
        return send_file(FILE_PATH, as_attachment=True)
    return jsonify({'error': 'No hay datos secuenciales registrados aún.'}), 444

@app.route('/borrar_historial', methods=['POST'])
def borrar_historial():
    global historial_analisis
    try:
        historial_analisis.clear()
        
        if os.path.exists(FILE_PATH):
            os.remove(FILE_PATH)
            
        return jsonify({'message': 'Historial borrado con éxito del servidor.'}), 200
    except Exception as e:
        return jsonify({'error': f'Fallo en el servidor: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False, host='127.0.0.1', port=5000)