# Proyecto de Predicción de Churn - Frontend Angular

Sistema frontend para análisis predictivo de abandono de clientes bancarios desarrollado con Angular 20.

## Descripción del Proyecto

Este frontend corresponde al **Informe Fase 3 del curso ACIF104 (Aprendizaje de Máquinas)** con una ponderación del 30% de la nota final. El proyecto implementa una interfaz web que consume servicios de un Backend For Frontend (BFF) desarrollado en .NET 8, el cual expone resultados de modelos de Machine Learning entrenados para predecir la probabilidad de churn (abandono) de clientes bancarios.

### Contexto Académico

El proyecto se enmarca en el análisis del dataset "Bank Customer Churn Prediction" disponible en Kaggle, enfocado en identificar patrones de comportamiento que anticipen el abandono de clientes. El frontend permite visualizar y analizar los resultados de cuatro modelos de Machine Learning implementados: Neural Network, Logistic Regression, Random Forest y XGBoost.

### Funcionalidades Implementadas

El sistema proporciona cuatro vistas principales:

1. **Dashboard**: Vista general con métricas del modelo de mejor desempeño y comparación visual entre los cuatro algoritmos mediante gráficos de barras y radar.

2. **Métricas**: Análisis detallado del modelo con mejor rendimiento, presentando accuracy, precision, recall, F1-Score y AUC mediante visualizaciones de barras y gráfico circular.

3. **Comparación de Modelos**: Evaluación comparativa de los cuatro algoritmos con gráficos de barras, radar y curvas ROC para cada modelo, permitiendo identificar fortalezas y debilidades de cada técnica.

4. **Predicción**: Sistema de predicción en tiempo real que muestra la probabilidad de churn de un cliente, clasificando el riesgo en tres niveles (Low, Medium, High) mediante un gauge animado y proporcionando recomendaciones estratégicas basadas en el resultado.

### Características Técnicas

- Diseño con identidad visual de Banco de Chile (color azul #003DA5)
- Interfaz responsive adaptable a diferentes dispositivos
- Visualizaciones interactivas con Chart.js
- Carga automática de datos desde el BFF
- Manejo de errores y estados de carga
- Animaciones fluidas en gráficos de predicción

## Tecnologías Utilizadas

- **Framework**: Angular 20.0.0
- **TypeScript**: 5.8.3
- **UI Framework**: Bootstrap 5.3.3
- **Gráficos**: Chart.js 4.4.7
- **Iconos**: Bootstrap Icons 1.11.0
- **HTTP Client**: Angular HttpClient con RxJS 7.8.1
- **Build System**: Angular CLI con esbuild

## Arquitectura del Proyecto

El proyecto se organiza siguiendo una estructura modular que separa responsabilidades:

La carpeta **core** contiene la lógica compartida:
- **services**: ChurnApiService maneja todas las llamadas HTTP al BFF
- **models**: Interfaces TypeScript que definen la estructura de datos (métricas, comparación y predicción)

La carpeta **features** agrupa los componentes por funcionalidad:
- **dashboard**: Página principal con resumen y comparación
- **metrics**: Visualización detallada de métricas del mejor modelo
- **comparison**: Comparación entre los cuatro modelos con curvas ROC
- **predict**: Predicción individual con gauge animado

Los archivos principales en **app**:
- app.component.ts define la estructura general (header, sidebar, footer)
- app.routes.ts configura la navegación entre vistas
- app.config.ts establece la configuración base de Angular

La carpeta **assets** almacena recursos estáticos como hojas de estilo CSS.

La carpeta **environments** define variables de configuración para desarrollo y producción.

## Endpoints del BFF Consumidos

El frontend se conecta al Backend For Frontend desarrollado en .NET 8 que corre en https://localhost:44331. Consume tres servicios principales:

**Métricas del Mejor Modelo** (GET /bff/churn/metricas)
Retorna las métricas detalladas del modelo con mejor desempeño, incluyendo accuracy, precision, recall, F1-Score y AUC.

**Comparación de Modelos** (GET /bff/churn/comparacion)
Entrega los resultados de los cuatro modelos de Machine Learning para realizar comparaciones y generar las curvas ROC.

**Predicción de Churn** (POST /bff/churn/predictivo)
Procesa la solicitud y devuelve la probabilidad de abandono junto con la clasificación del nivel de riesgo.

## Requisitos Previos

- Node.js versión 18 o superior
- npm versión 9 o superior
- Angular CLI versión 20
- BFF en .NET 8 ejecutándose en https://localhost:44331

## Instalación

1. Clonar el repositorio:
```powershell
git clone <URL_DEL_REPOSITORIO>
cd FrontEnd.acif104_s9_Grupo10
```

2. Instalar dependencias:
```powershell
npm install
```

3. Verificar que el Backend For Frontend esté ejecutándose en https://localhost:44331

## Ejecución del Proyecto

### Modo Desarrollo

Ejecutar el siguiente comando en la raíz del proyecto:

```powershell
npm start
```

Este comando iniciará el servidor de desarrollo con configuración de proxy automática para comunicarse con el BFF. La aplicación estará disponible en:

```
http://localhost:4200
```

El servidor se recargará automáticamente al detectar cambios en los archivos fuente.

### Build de Producción

Para compilar el proyecto para producción:

```powershell
npm run build
```

Los archivos optimizados se generarán en el directorio `dist/` y estarán listos para despliegue.

## Estructura de Navegación

El sistema cuenta con 4 vistas principales accesibles desde el menú lateral:

### 1. Dashboard
- Resumen general de métricas
- Identificación del mejor modelo
- Gráficos comparativos (Bar Chart y Radar Chart)
- Tabla resumen de todos los modelos

### 2. Métricas
- Métricas detalladas del modelo de mejor desempeño
- Visualización de Accuracy, Precision, Recall, F1-Score y AUC
- Gráficos de barra y doughnut
- Interpretación de fortalezas y áreas de mejora

### 3. Comparación
- Tabla comparativa de 4 modelos de ML
- Gráficos de comparación múltiple
- **Curvas ROC** de todos los modelos
- Análisis e insights clave

### 4. Predicción
- Carga automática de predicción en tiempo real
- Visualización de probabilidad de churn con animación
- Clasificación de nivel de riesgo (Low/Medium/High)
- Recomendaciones estratégicas personalizadas
- Gauge chart con efecto de subida animado

## Modelos Comparados

El sistema compara y evalúa 4 modelos de Machine Learning:

1. **Logistic Regression** (Mejor modelo general)
   - Accuracy: 80.68%
   - F1-Score: 61.94%
   - AUC: 84.53%

2. **Neural Network**
   - Accuracy: 79.92%
   - AUC: 84.74% (mejor AUC)

3. **Random Forest**
   - Accuracy: 79.17%
   - AUC: 83.82%

4. **XGBoost**
   - Accuracy: 78.12%
   - AUC: 83.14%

## Métricas Visualizadas

- **Accuracy**: Exactitud general del modelo
- **Precision**: Precisión en predicciones positivas
- **Recall**: Sensibilidad del modelo (capacidad de detectar casos positivos)
- **F1-Score**: Media armónica entre Precision y Recall
- **AUC**: Área bajo la curva ROC (capacidad discriminatoria)

## Diseño Visual

El sistema implementa un diseño inspirado en el Banco de Chile:

- **Color Principal**: #003DA5 (Azul corporativo)
- **Fondo**: #F5F5F5 (Gris claro)
- **Layout**: Header superior, sidebar lateral izquierdo, footer inferior
- **Responsive**: Adaptable a dispositivos móviles

## Versión de Angular

Este proyecto utiliza **Angular 20.0.0**, la versión más reciente del framework que incorpora:

- Arquitectura de componentes standalone
- Mejoras en el sistema de compilación con esbuild
- Optimizaciones de rendimiento
- Soporte para TypeScript 5.8

## Scripts Disponibles

```powershell
npm start          # Inicia servidor de desarrollo con proxy configurado
npm run build      # Compilación para producción
npm run watch      # Compilación con recarga automática
npm test           # Ejecuta tests unitarios
```

## Arquitectura y Patrones

### Servicios
El proyecto implementa un servicio centralizado **ChurnApiService** que:
- Gestiona todas las peticiones HTTP al BFF
- Implementa manejo de errores con tipado estricto
- Utiliza observables de RxJS para programación reactiva
- Incluye reintentos automáticos en caso de fallos de red

### Componentes Standalone
Todos los componentes utilizan la arquitectura standalone de Angular 20, eliminando la necesidad de NgModules y permitiendo una mayor modularidad y tree-shaking optimizado.

### Modelos de Datos
Se definen interfaces TypeScript estrictas para todas las respuestas del API:
- **MetricsResponse**: Estructura de métricas del modelo
- **ComparisonResponse**: Estructura de comparación entre modelos
- **PredictResponse**: Estructura de predicción de churn

### Comunicación con el BFF
El sistema utiliza un archivo `proxy.conf.json` para redirigir las peticiones `/bff/*` al backend en desarrollo, evitando problemas de CORS.

## Resolución de Problemas

### El BFF no responde
Verificar que el backend .NET 8 esté ejecutándose correctamente en `https://localhost:44331`

### Puerto 4200 en uso
Si el puerto está ocupado, el servidor Angular ofrecerá automáticamente usar un puerto alternativo.

### Errores de compilación
Limpiar la instalación y reinstalar dependencias:
```powershell
Remove-Item node_modules -Recurse -Force
npm install
```

### El favicon no se actualiza
Limpiar caché del navegador con Ctrl+Shift+R o abrir en modo incógnito.

## Información Académica

**Curso**: ACIF104 - Aprendizaje de Máquinas  
**Fase**: Informe 3 (Ponderación 30%)  
**Grupo**: Grupo 10  
**Dataset**: Bank Customer Churn Prediction (Kaggle)

## Notas Importantes

- El sistema requiere que el BFF esté operativo para funcionar correctamente
- Todas las vistas cargan datos automáticamente al inicializarse
- Los gráficos incluyen animaciones para mejorar la experiencia de usuario
- El diseño implementa la identidad visual de Banco de Chile según requerimientos
