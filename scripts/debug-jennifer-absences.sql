-- Script para analizar el caso específico de Jennifer Bedoya Benitez
-- Cédula: 10221617

-- Primero, veamos todas sus faltas del último mes
SELECT 
  a.date::DATE AS fecha_falta,
  TO_CHAR(a.date, 'Day') AS dia_semana,
  EXTRACT(DOW FROM a.date) AS dia_numero, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
  c.name AS clase,
  c.sport AS deporte,
  cs.date::DATE AS fecha_sesion,
  a.status
FROM attendances a
INNER JOIN class_sessions cs ON a."sessionId" = cs.id
INNER JOIN classes c ON cs."classId" = c.id
INNER JOIN students s ON a."studentId" = s.id
WHERE 
  s.id = '10221617'
  AND a.status = 'ABSENT'
  AND a.date >= CURRENT_DATE - INTERVAL '2 months'
  AND a.date <= CURRENT_DATE
ORDER BY a.date;

-- Ver las sesiones de la clase para entender la frecuencia
SELECT 
  c.name AS clase,
  cs.date::DATE AS fecha_sesion,
  TO_CHAR(cs.date, 'Day') AS dia_semana,
  EXTRACT(DOW FROM cs.date) AS dia_numero,
  CASE 
    WHEN a.id IS NULL THEN 'Sin registro'
    WHEN a.status = 'ABSENT' THEN 'Ausente'
    WHEN a.status = 'PRESENT' THEN 'Presente'
    WHEN a.status = 'LATE' THEN 'Tarde'
    ELSE a.status::TEXT
  END AS estado_asistencia
FROM class_sessions cs
INNER JOIN classes c ON cs."classId" = c.id
INNER JOIN students s ON s.id = '10221617'
LEFT JOIN attendances a ON a."sessionId" = cs.id AND a."studentId" = s.id
WHERE 
  cs."classId" IN (
    SELECT DISTINCT cs2."classId"
    FROM attendances a2
    INNER JOIN class_sessions cs2 ON a2."sessionId" = cs2.id
    WHERE a2."studentId" = '10221617' AND a2.status = 'ABSENT'
  )
  AND cs.date >= CURRENT_DATE - INTERVAL '2 months'
  AND cs.date <= CURRENT_DATE
ORDER BY cs.date;

-- Analizar secuencias considerando solo las sesiones de clase (no días calendario)
WITH 
-- Obtener todas las sesiones de la clase con su estado de asistencia
class_sessions_with_attendance AS (
  SELECT 
    cs.id AS session_id,
    cs."classId",
    cs.date::DATE AS session_date,
    c.name AS class_name,
    s.id AS student_id,
    s.name AS student_name,
    CASE 
      WHEN a.id IS NULL THEN 'NO_REGISTERED'
      ELSE a.status::TEXT
    END AS attendance_status,
    ROW_NUMBER() OVER (
      PARTITION BY cs."classId", s.id 
      ORDER BY cs.date
    ) AS session_number
  FROM class_sessions cs
  INNER JOIN classes c ON cs."classId" = c.id
  CROSS JOIN students s
  LEFT JOIN attendances a ON a."sessionId" = cs.id AND a."studentId" = s.id
  WHERE 
    s.id = '10221617'
    AND cs.date >= CURRENT_DATE - INTERVAL '2 months'
    AND cs.date <= CURRENT_DATE
    AND cs."classId" IN (
      SELECT DISTINCT cs2."classId"
      FROM attendances a2
      INNER JOIN class_sessions cs2 ON a2."sessionId" = cs2.id
      WHERE a2."studentId" = '10221617' AND a2.status = 'ABSENT'
    )
),
-- Identificar faltas consecutivas en términos de sesiones de clase
consecutive_absences AS (
  SELECT 
    session_id,
    "classId",
    session_date,
    class_name,
    student_id,
    student_name,
    session_number,
    attendance_status,
    -- Calcular diferencia en número de sesión (no días calendario)
    session_number - LAG(session_number) OVER (
      PARTITION BY "classId", student_id 
      ORDER BY session_date
    ) AS sessions_since_last,
    -- Marcar inicio de nueva secuencia
    CASE 
      WHEN session_number - LAG(session_number) OVER (
        PARTITION BY "classId", student_id 
        ORDER BY session_date
      ) > 1
      OR LAG(session_number) OVER (
        PARTITION BY "classId", student_id 
        ORDER BY session_date
      ) IS NULL
      THEN 1
      ELSE 0
    END AS is_new_sequence
  FROM class_sessions_with_attendance
  WHERE attendance_status = 'ABSENT'
),
-- Agrupar secuencias consecutivas
grouped_sequences AS (
  SELECT 
    "classId",
    class_name,
    student_id,
    student_name,
    session_date,
    SUM(is_new_sequence) OVER (
      PARTITION BY "classId", student_id 
      ORDER BY session_date
    ) AS sequence_group,
    session_number
  FROM consecutive_absences
),
-- Contar faltas por secuencia
sequence_counts AS (
  SELECT 
    "classId",
    class_name,
    student_id,
    student_name,
    sequence_group,
    COUNT(*) AS consecutive_count,
    MIN(session_date) AS first_absence,
    MAX(session_date) AS last_absence,
    STRING_AGG(session_date::TEXT, ', ' ORDER BY session_date) AS absence_dates
  FROM grouped_sequences
  GROUP BY 
    "classId", 
    class_name, 
    student_id, 
    student_name, 
    sequence_group
)

-- Resultado: Secuencias de faltas consecutivas por sesiones de clase
SELECT 
  student_name AS "Estudiante",
  class_name AS "Clase",
  consecutive_count AS "Faltas Consecutivas",
  first_absence AS "Primera Falta",
  last_absence AS "Última Falta",
  absence_dates AS "Fechas de Faltas"
FROM sequence_counts
WHERE consecutive_count >= 3
ORDER BY consecutive_count DESC;

