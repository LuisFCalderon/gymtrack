# Gym Track --- Alcance Simplificado y Cambio de Producto

**Versión:** V2 --- Alcance definido\
**Concepto:** Libreta digital personal de ejercicios\
**Arquitectura:** Local-first, SQLite, offline\
**Plataforma inicial:** PWA\
**Plataforma objetivo:** Android APK

------------------------------------------------------------------------

## 1. Cambio de alcance

Gym Track se redefine deliberadamente para evitar convertir el proyecto
en una plataforma fitness completa.

La aplicación será principalmente una:

> **Libreta digital personal para registrar entrenamientos, cardio, agua
> y evolución básica.**

El objetivo no es ofrecer entrenamiento personalizado, red social,
nutrición, inteligencia artificial ni sincronización entre dispositivos.

La prioridad es que el usuario pueda abrir la aplicación en el gimnasio,
registrar lo que está haciendo rápidamente, modificar su rutina cuando
sea necesario y posteriormente consultar su historial.

------------------------------------------------------------------------

# 2. Principio rector

Gym Track debe responder a una pregunta sencilla:

> **¿Qué hice hoy y cómo se compara con lo que hice anteriormente?**

Todo lo que no contribuya directamente a responder esa pregunta debe
considerarse secundario o quedar fuera del alcance inicial.

------------------------------------------------------------------------

# 3. Alcance funcional V2

## 3.1 Rutina semanal

La aplicación tendrá una rutina organizada por los siete días:

-   Lunes
-   Martes
-   Miércoles
-   Jueves
-   Viernes
-   Sábado
-   Domingo

Cada día puede contener cualquier cantidad de ejercicios.

El usuario podrá:

-   Agregar ejercicios.
-   Editar ejercicios.
-   Eliminar ejercicios.
-   Reordenar ejercicios.
-   Configurar series objetivo.
-   Configurar repeticiones objetivo.
-   Escribir notas.

No habrá un límite artificial de tres ejercicios por día.

------------------------------------------------------------------------

## 3.2 Registro de ejercicios

Durante el entrenamiento se registrarán principalmente:

-   Ejercicio.
-   Serie.
-   Peso.
-   Repeticiones.
-   RIR opcional.
-   Notas opcionales.
-   Fecha.

Ejemplo:

  Serie      Peso   Reps   RIR
  ------- ------- ------ -----
  1         60 kg     10     2
  2         60 kg     10     2
  3         65 kg      8     1
  4         65 kg      7     1

El registro debe ser rápido y adecuado para utilizarse mientras se
entrena.

------------------------------------------------------------------------

# 4. Sustitución de ejercicios

Esta funcionalidad se mantiene como una característica importante.

El usuario puede cambiar un ejercicio porque:

-   La máquina está ocupada.
-   El equipo no está disponible.
-   Prefiere otro ejercicio.
-   Existe cualquier otra circunstancia práctica.

Ejemplo:

**Sentadilla → Hack Squat**

La aplicación debe ofrecer dos opciones:

### Solo hoy

El cambio se aplica al entrenamiento actual, sin modificar la rutina.

### Actualizar rutina

El nuevo ejercicio reemplaza al anterior en la configuración habitual.

Cuando el cambio sea temporal, el ejercicio utilizado debe conservarse
como parte del registro histórico de esa sesión.

------------------------------------------------------------------------

# 5. Historial

El historial es una de las funciones principales.

El usuario debe poder consultar qué hizo anteriormente.

Ejemplo:

``` text
Press banca

14 Sep
60 kg × 10
60 kg × 10
65 kg × 8
65 kg × 7

07 Sep
57.5 kg × 10
57.5 kg × 10
60 kg × 9
```

No se pretende crear un sistema avanzado de análisis deportivo.

El objetivo es permitir comparar fácilmente el entrenamiento actual con
entrenamientos anteriores.

------------------------------------------------------------------------

# 6. Progreso básico

La aplicación podrá calcular y mostrar indicadores sencillos.

### Fuerza

-   Peso utilizado.
-   Repeticiones.
-   Número de series.
-   Volumen aproximado.
-   Mejor peso registrado.
-   Evolución del ejercicio.

### Volumen

``` text
Volumen = Σ (peso × repeticiones)
```

Ejemplo:

``` text
60 × 10 = 600 kg
65 × 8  = 520 kg

Total = 1.120 kg
```

Las estadísticas deben mantenerse simples y fáciles de interpretar.

------------------------------------------------------------------------

# 7. Cardio

El cardio se mantiene, pero con un alcance reducido.

Debe poder registrarse independientemente de los ejercicios de fuerza y
en cualquier día.

Tipos iniciales:

-   Caminata.
-   Carrera.
-   Bicicleta.
-   Elíptica.
-   Escaladora.
-   Otro.

Métricas:

-   Tiempo.
-   Distancia.
-   Pasos.
-   Ritmo.
-   Velocidad.
-   Inclinación.
-   Frecuencia cardíaca, si el usuario dispone del dato.
-   Notas.

No se desarrollará inicialmente seguimiento GPS ni rutas.

------------------------------------------------------------------------

# 8. Cardio por intervalos

Se mantendrá soporte básico para sesiones con intervalos.

Ejemplo:

``` text
Carrera

Intervalo 1 — 400 m
Intervalo 2 — 400 m
Intervalo 3 — 400 m
Intervalo 4 — 400 m
```

Cada intervalo puede guardar:

-   Tiempo.
-   Distancia.
-   Ritmo.
-   Velocidad.
-   Inclinación.
-   Nota.

No se pretende competir con aplicaciones especializadas de running.

------------------------------------------------------------------------

# 9. Agua

La hidratación se mantendrá como una función sencilla.

El usuario podrá registrar cantidades de agua cualquier día, incluyendo
días de descanso.

Ejemplo:

``` text
Meta:       2,5 L
Consumido:  2,0 L

Progreso:   80 %
```

Se permitirá:

-   Registrar cantidad.
-   Ver total diario.
-   Configurar meta.
-   Consultar resumen histórico sencillo.

No se desarrollará un sistema nutricional.

------------------------------------------------------------------------

# 10. Peso corporal e IMC

Se permitirá registrar:

-   Peso.
-   Altura.
-   Fecha.

El IMC podrá calcularse como referencia:

``` text
IMC = peso / altura²
```

No se desarrollará un módulo médico.

------------------------------------------------------------------------

# 11. Dashboard

La pantalla principal debe concentrarse en lo que importa hoy.

Ejemplo:

``` text
HOY — Pecho + Espalda

6 ejercicios
12 series registradas

Cardio
25 min

Agua
1,5 / 2,5 L

[ Iniciar entrenamiento ]
[ + Cardio ]
[ + Agua ]
[ Registrar peso ]
```

La pantalla debe evitar exceso de información.

------------------------------------------------------------------------

# 12. Arquitectura de datos

La aplicación utilizará **SQLite local** como almacenamiento principal.

SQLite es una base de datos embebida/local. No será necesario montar
inicialmente:

-   PostgreSQL.
-   MySQL.
-   Firebase.
-   Supabase.
-   API propia.
-   Servidor dedicado.

Modelo conceptual:

``` text
                  Gym Track
                     │
                     ▼
              Interfaz de usuario
                     │
                     ▼
                  SQLite
                     │
                     ▼
             Dispositivo local
```

------------------------------------------------------------------------

# 13. Modelo SQLite mínimo

Las tablas principales serán:

## routine_days

Representa los días de la rutina.

``` text
id
weekday
name
rest_day
```

## routine_exercises

Representa los ejercicios configurados para cada día.

``` text
id
day_id
name
order_index
target_sets
target_reps
notes
```

## workout_sessions

Representa una sesión realizada.

``` text
id
date
day_id
started_at
ended_at
notes
```

## workout_sets

Representa las series realizadas.

``` text
id
session_id
exercise_name
set_number
weight_kg
reps
rir
notes
```

## cardio_sessions

``` text
id
date
type
duration_seconds
distance_km
steps
pace
speed_kmh
incline_percent
average_heart_rate
notes
```

## cardio_intervals

``` text
id
cardio_session_id
interval_number
duration_seconds
distance_km
pace
speed_kmh
incline_percent
notes
```

## water_records

``` text
id
date
liters
timestamp
```

## body_measurements

``` text
id
date
weight_kg
height_cm
bmi
notes
```

La estructura puede modificarse durante la implementación si una
solución más simple resulta adecuada.

------------------------------------------------------------------------

# 14. Espacio de almacenamiento

El tamaño de los datos personales de una aplicación como Gym Track será
pequeño.

Un escenario de uso intensivo podría contener:

-   Miles de entrenamientos.
-   Decenas de miles de series.
-   Miles de registros de cardio.
-   Miles de registros de agua.
-   Mediciones corporales periódicas.

Incluso con notas y metadatos, el volumen esperado seguirá siendo
pequeño para un teléfono moderno.

Por lo tanto:

> **El espacio ocupado por SQLite no es una limitación relevante para
> Gym Track.**

La prioridad debe ser la simplicidad, integridad y persistencia de los
datos.

------------------------------------------------------------------------

# 15. Offline

El funcionamiento sin Internet es un requisito fundamental.

El usuario debe poder:

-   Abrir la aplicación.
-   Ver su rutina.
-   Registrar ejercicios.
-   Registrar series.
-   Cambiar ejercicios.
-   Registrar cardio.
-   Registrar agua.
-   Registrar peso.
-   Consultar historial.

Todo esto debe funcionar sin conexión.

La información permanecerá en el dispositivo.

------------------------------------------------------------------------

# 16. PWA

La primera plataforma será una PWA.

Debe incluir:

-   Web App Manifest.
-   Service Worker.
-   Caché de recursos.
-   Funcionamiento offline.
-   Iconos.
-   Instalación en dispositivos compatibles.
-   Interfaz mobile-first.

------------------------------------------------------------------------

# 17. APK Android

Una vez estable y validada la PWA, podrá empaquetarse para Android.

La opción recomendada es **Capacitor**, reutilizando la aplicación
existente.

El APK no debe requerir red para las funciones básicas de la libreta.

------------------------------------------------------------------------

# 18. Fuera del alcance de V2

Para mantener el concepto de libreta, las siguientes funciones quedan
explícitamente fuera del alcance inicial.

## No habrá cuentas

No habrá:

-   Login.
-   Registro de usuarios.
-   Recuperación de contraseña.

## No habrá backend

No se desarrollará un servidor para almacenar los registros.

## No habrá sincronización cloud

Los datos serán locales.

La sincronización podrá evaluarse posteriormente, pero no forma parte de
V2.

## No habrá red social

No habrá:

-   Amigos.
-   Seguidores.
-   Likes.
-   Comentarios.
-   Rankings.

## No habrá nutrición

No habrá inicialmente:

-   Dietas.
-   Macros.
-   Calorías consumidas.
-   Recetas.
-   Planes alimenticios.

## No habrá entrenador virtual

No habrá:

-   IA entrenadora.
-   Recomendaciones automáticas.
-   Generación automática de rutinas.
-   Coaching.

## No habrá GPS

El cardio no incluirá inicialmente:

-   Mapas.
-   Rutas.
-   Tracking GPS.
-   Seguimiento en tiempo real.

## No habrá integración con wearables

Inicialmente no se integrará con:

-   Smartwatch.
-   Bandas deportivas.
-   Google Fit.
-   Health Connect.
-   Apple Health.

Estas integraciones podrán evaluarse posteriormente.

## No habrá biblioteca multimedia

No se desarrollará inicialmente:

-   Catálogo de videos.
-   Animaciones de ejercicios.
-   Biblioteca multimedia.
-   Contenido educativo.

------------------------------------------------------------------------

# 19. Funciones secundarias permitidas

Estas funciones pueden incorporarse posteriormente sin cambiar el
concepto de libreta:

-   Temporizador de descanso.
-   Duplicar entrenamiento.
-   Exportar datos.
-   Importar datos.
-   Gráficas sencillas.
-   PR básico.
-   Medidas corporales adicionales.
-   Fotos de progreso.
-   Notificaciones locales.

No deben convertirse en requisitos que retrasen el núcleo de la
aplicación.

------------------------------------------------------------------------

# 20. Prioridades

## Prioridad P0 --- Esencial

Debe existir antes de considerar V2 funcional:

1.  Rutina semanal.
2.  Ejercicios ilimitados.
3.  Editar ejercicios.
4.  Eliminar ejercicios.
5.  Reordenar ejercicios.
6.  Sustitución temporal/permanente.
7.  Registro de series.
8.  Peso.
9.  Repeticiones.
10. Historial.
11. SQLite/local.
12. Offline.
13. Dark mode.

## Prioridad P1 --- Importante

1.  Cardio.
2.  Intervalos.
3.  Agua.
4.  Peso corporal.
5.  IMC.
6.  Progreso básico.
7.  Dashboard.

## Prioridad P2 --- Opcional

1.  Gráficas avanzadas.
2.  Exportación.
3.  Importación.
4.  Temporizador.
5.  PR.
6.  Notificaciones.

------------------------------------------------------------------------

# 21. Definición de producto

Gym Track **no es**:

> Una plataforma de fitness.

Gym Track **sí es**:

> Una libreta digital personal que organiza y conserva el historial del
> entrenamiento.

La experiencia principal debe ser:

``` text
Abrir
  ↓
Ver entrenamiento de hoy
  ↓
Entrenar
  ↓
Registrar series
  ↓
Cambiar ejercicio si hace falta
  ↓
Registrar cardio/agua si corresponde
  ↓
Guardar
  ↓
Consultar progreso cuando sea necesario
```

------------------------------------------------------------------------

# 22. Criterios de aceptación del nuevo alcance

La V2 será considerada correctamente enfocada si:

-   [ ] Se puede utilizar como una libreta personal.
-   [ ] No necesita una cuenta.
-   [ ] No necesita Internet.
-   [ ] No necesita backend.
-   [ ] No necesita sincronización.
-   [ ] Los datos se almacenan localmente.
-   [ ] La rutina es configurable.
-   [ ] Hay más de tres ejercicios por día.
-   [ ] Se pueden editar los ejercicios.
-   [ ] Se pueden sustituir ejercicios.
-   [ ] Se puede registrar cada serie.
-   [ ] Se puede consultar el historial.
-   [ ] Se puede registrar cardio.
-   [ ] Se puede registrar agua.
-   [ ] Se puede registrar peso.
-   [ ] Se puede observar progreso básico.
-   [ ] La interfaz es sencilla.
-   [ ] La aplicación funciona offline.
-   [ ] Puede instalarse como PWA.
-   [ ] Queda preparada para convertirse en APK.

------------------------------------------------------------------------

# 23. Regla para futuras funcionalidades

Antes de agregar una nueva funcionalidad debe responderse:

> **¿Esta función mejora directamente la experiencia de una libreta
> digital de entrenamiento?**

Si la respuesta es no, debe quedar fuera de V2.

Esto evita que el proyecto crezca innecesariamente.

------------------------------------------------------------------------

# 24. Objetivo final de V2

El objetivo no es tener la mayor cantidad de funciones.

El objetivo es tener una aplicación que el usuario realmente quiera
abrir **cada vez que va al gimnasio**.

Si Gym Track permite registrar rápidamente:

-   Qué ejercicio hizo.
-   Cuánto peso utilizó.
-   Cuántas repeticiones realizó.
-   Qué ejercicio tuvo que sustituir.
-   Qué cardio hizo.
-   Cuánta agua tomó.
-   Cómo ha progresado.

entonces la V2 cumple su propósito.

------------------------------------------------------------------------

# 25. Resumen ejecutivo

  Área                            V2
  ------------------------------- -----------------
  Rutina semanal                  Sí
  Ejercicios                      Sí
  Ejercicios ilimitados por día   Sí
  Edición                         Sí
  Sustituciones                   Sí
  Series/peso/reps                Sí
  Historial                       Sí
  Progreso básico                 Sí
  Cardio                          Sí
  Intervalos                      Sí
  Agua                            Sí
  Peso/IMC                        Sí
  SQLite                          Sí
  Offline                         Sí
  PWA                             Sí
  Dark mode                       Sí
  APK Android                     Etapa posterior
  Backend                         No
  Cloud                           No
  Login                           No
  Social                          No
  Nutrición                       No
  IA                              No
  GPS                             No
  Wearables                       No inicialmente

------------------------------------------------------------------------

## Conclusión

La reducción de alcance es intencional.

**Gym Track debe ser pequeña, rápida, confiable y útil.**

Una aplicación sencilla que funciona como una libreta digital puede
aportar más valor que una plataforma enorme llena de funcionalidades que
el usuario nunca utiliza.

La arquitectura local con SQLite permite mantener los datos en el
dispositivo, trabajar sin Internet y conservar abierta la posibilidad de
evolucionar posteriormente hacia APK, sincronización u otras funciones
sin convertirlas en requisitos de V2.
