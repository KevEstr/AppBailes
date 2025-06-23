# 🚀 Guía CI/CD - Paradise Dance Academy

## ¿Qué es CI/CD?

**CI/CD** = Continuous Integration + Continuous Deployment
- **CI**: Cada vez que haces commit, se ejecutan tests automáticamente
- **CD**: Si todo está bien, se despliega automáticamente

## 📁 Archivos Creados

```
.github/workflows/main.yml  # Pipeline principal
vercel.json                 # Configuración de deployment
package.json               # Scripts actualizados
```

## 🔧 Configuración Paso a Paso

### 1. Configurar Secrets en GitHub

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**

Necesitas agregar estos 3 secrets:

| Secret Name | Valor | Dónde conseguirlo |
|-------------|-------|-------------------|
| `VERCEL_TOKEN` | Tu token de Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ID de tu org | Comando: `vercel project ls` |
| `VERCEL_PROJECT_ID` | ID del proyecto | Comando: `vercel project ls` |

### 2. Obtener los IDs de Vercel

```bash
# Instalar Vercel CLI si no lo tienes
npm install -g vercel

# Login
vercel login

# Conectar tu proyecto
vercel link

# Ver tus proyectos y copiar los IDs
vercel project ls
```

### 3. Crear los Secrets

1. Ve a **GitHub.com** → Tu repo → **Settings**
2. **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Agrega cada uno de los 3 secrets

## 🔄 Cómo Funciona

### Flujo Automático

```
📝 Haces commit → 🧪 Tests → 🏗️ Build → 🚀 Deploy
```

### Por Branch

- **`RamaKev`** → Deploy a **Staging**
- **`develop`** → Deploy a **Staging**  
- **`main`** → Deploy a **Production**

## 📊 Qué Hace el Pipeline

### 1. **Tests** (3-5 min)
✅ Ejecuta Jest tests
✅ Verifica tipos TypeScript
✅ Ejecuta ESLint
✅ Genera Prisma client

### 2. **Build** (2-3 min)
✅ Construye la aplicación Next.js
✅ Verifica que no hay errores

### 3. **Deploy** (1-2 min)
✅ Sube a Vercel automáticamente
✅ Configura variables de entorno

## 🎯 Comandos Útiles

```bash
# Verificar antes de commit
npm run lint
npm run type-check
npm test
npm run build

# Deploy manual si necesitas
npm run vercel:preview  # Staging
npm run vercel:deploy   # Production

# Ver logs de Vercel
vercel logs
```

## 🔍 Monitoreo

### Ver el Pipeline
1. Ve a tu repo en GitHub
2. Click en **Actions**
3. Verás todos los runs del pipeline

### Ver Deployments
1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click en tu proyecto
3. Verás todos los deployments

## ❌ Troubleshooting

### Pipeline Falla

**1. Tests fallan:**
```bash
# Ejecuta local para ver el error
npm test
```

**2. Build falla:**
```bash
# Verifica que build funciona local
npm run build
```

**3. Deploy falla:**
- Verifica que los 3 secrets están configurados
- Revisa logs en Vercel dashboard

### Comandos de Debug

```bash
# Si Prisma da problemas
npm run db:generate

# Si hay errores de tipos
npm run type-check

# Limpiar cache
rm -rf .next
npm run build
```

## 🚀 Usar el CI/CD

### Workflow Normal

```bash
# 1. Trabajas en tu branch
git checkout RamaKev
# ... haces cambios ...

# 2. Commit (esto dispara el pipeline)
git add .
git commit -m "feat: nueva funcionalidad"
git push

# 3. Ve a GitHub Actions para ver el progreso
# 4. Si todo pasa, se despliega automáticamente
```

### Merge a Production

```bash
# Cuando quieras ir a production
git checkout main
git merge RamaKev
git push  # Esto despliega a production
```

## 📈 Beneficios

✅ **Calidad**: Tests automáticos evitan bugs
✅ **Velocidad**: Deploy automático
✅ **Confianza**: Sabes que todo funciona antes de deploy
✅ **Historial**: Puedes ver todos los deployments
✅ **Rollback**: Fácil volver a versión anterior

## 🎉 ¡Ya está listo!

Tu pipeline está configurado. Cada commit ejecutará:
1. Tests
2. Build
3. Deploy (si está en main/develop/RamaKev)

**Próximo paso**: Hacer un commit para probar que funciona

---

## 🆘 ¿Problemas?

1. **Verifica secrets** están configurados en GitHub
2. **Revisa logs** en GitHub Actions
3. **Checa dashboard** de Vercel
4. **Ejecuta local** para debuggear 