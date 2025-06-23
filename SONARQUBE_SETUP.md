# 🔍 SonarQube Setup - Paradise Dance Academy

## 📋 Configuración de SonarQube

### 1. Crear Cuenta en SonarCloud

1. Ve a [sonarcloud.io](https://sonarcloud.io)
2. Sign up con tu cuenta de GitHub
3. Importa tu organización de GitHub
4. Crea un nuevo proyecto

### 2. Configurar Proyecto

**En SonarCloud:**
1. **Project Key**: `paradise-dance-academy`
2. **Organization**: Tu organización de GitHub
3. **Project Name**: `Paradise Dance Academy`

### 3. Obtener Tokens

**En SonarCloud → My Account → Security:**
1. **Generate Token**
2. **Name**: `Paradise Dance Academy CI`
3. **Type**: `User Token`
4. **Expiration**: `90 days` (o más)
5. **Copiar el token generado**

### 4. Configurar GitHub Secrets

Ve a tu repo → **Settings** → **Secrets and variables** → **Actions**

Agregar estos 3 secrets:

```
SONAR_TOKEN=tu_token_generado_en_sonarcloud
SONAR_HOST_URL=https://sonarcloud.io
GITHUB_TOKEN=ghp_xxxxx (ya existe por defecto)
```

### 5. Actualizar sonar-project.properties

Edita el archivo `sonar-project.properties`:

```properties
sonar.projectKey=tu-org_paradise-dance-academy
sonar.organization=tu-org-github
```

## 🎯 Quality Gates Configuradas

### Métricas de Calidad

- **Coverage**: > 70%
- **Duplicated Lines**: < 3%
- **Maintainability Rating**: A
- **Reliability Rating**: A
- **Security Rating**: A

### Reglas Activas

- **Code Smells**: Detecta problemas de mantenibilidad
- **Bugs**: Detecta errores potenciales
- **Vulnerabilities**: Detecta problemas de seguridad
- **Security Hotspots**: Revisa puntos críticos

## 📊 Métricas Monitoreadas

### Code Coverage
- **Archivos incluidos**: `app/`, `components/`, `lib/`, `hooks/`
- **Archivos excluidos**: Tests, configs, tipos
- **Reporte**: `coverage/lcov.info`

### Duplicaciones
- **Threshold**: < 3%
- **Exclusiones**: Tests y archivos de configuración

### Complejidad
- **Complejidad ciclomática**: Monitoreada por función
- **Complejidad cognitiva**: Alertas en funciones complejas

## 🚦 Pipeline Integration

### Flujo Completo

```
Push → ESLint → TypeScript → Tests → SonarQube → Quality Gate
```

### Estados del Pipeline

- ✅ **Success**: Todos los checks pasan
- ❌ **Failed**: Quality gate falla
- ⚠️ **Warning**: Issues menores detectados

## 🔧 Configuración Local (Opcional)

Para análisis local con SonarQube:

```bash
# Instalar SonarQube Scanner
npm install -g sonarqube-scanner

# Ejecutar análisis local
sonar-scanner \
  -Dsonar.projectKey=paradise-dance-academy \
  -Dsonar.sources=. \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=tu_token
```

## 📈 Dashboard y Reportes

### Ver Resultados

1. **SonarCloud Dashboard**: [sonarcloud.io/project/overview](https://sonarcloud.io)
2. **GitHub Actions**: Tab "Actions" en tu repo
3. **Pull Request**: Comentarios automáticos en PRs

### Métricas Clave

- **Overall Coverage**: % de código cubierto por tests
- **New Coverage**: Coverage en código nuevo
- **Duplications**: % de código duplicado
- **Issues**: Bugs, vulnerabilidades, code smells

## 🎯 Quality Gates Personalizadas

### Configurar Condiciones

En SonarCloud → Project → Quality Gates:

```
Coverage on New Code > 80%
Duplicated Lines on New Code < 3%
Maintainability Rating on New Code = A
Reliability Rating on New Code = A
Security Rating on New Code = A
```

## 🔄 Workflow

### En cada Push

1. **CI ejecuta tests** con coverage
2. **SonarQube analiza** el código
3. **Quality gate evalúa** las métricas
4. **Resultado** se reporta en GitHub

### En Pull Requests

1. **Análisis incremental** del código nuevo
2. **Comentarios automáticos** en el PR
3. **Bloqueo del merge** si quality gate falla

## 🛠️ Troubleshooting

### Errores Comunes

**Error: "Quality Gate Failed"**
```bash
# Revisar métricas en SonarCloud
# Corregir issues reportados
# Hacer nuevo commit
```

**Error: "Token Invalid"**
```bash
# Verificar SONAR_TOKEN en GitHub Secrets
# Regenerar token en SonarCloud si expiró
```

**Error: "Project Not Found"**
```bash
# Verificar sonar.projectKey en sonar-project.properties
# Verificar que el proyecto existe en SonarCloud
```

## ✅ Checklist de Setup

- [ ] Cuenta en SonarCloud creada
- [ ] Proyecto configurado en SonarCloud
- [ ] Token generado y copiado
- [ ] GitHub Secrets configurados
- [ ] sonar-project.properties actualizado
- [ ] Quality Gates configurados
- [ ] Pipeline probado con commit

---

## 🎉 ¡Listo!

Una vez configurado, cada push ejecutará automáticamente:

1. ✅ **ESLint** - Análisis de código
2. ✅ **TypeScript** - Verificación de tipos  
3. ✅ **Jest** - Tests con coverage
4. ✅ **SonarQube** - Quality gates
5. ✅ **Security** - Audit de vulnerabilidades

**¡Tu código tendrá calidad empresarial automáticamente! 🚀** 