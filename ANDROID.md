# Android Build — Tennis Vision Coach

## Требования
- Node.js 18+
- Android Studio (с Android SDK)
- Java 17

## Сборка

```bash
git clone https://github.com/X988/tennis-vision-coach-clean
cd tennis-vision-coach-clean
npm install
npx cap add android
npm run android
```

Команда `npm run android` соберёт web-часть, синхронизирует с Android-проектом и откроет Android Studio.

## В Android Studio
1. Дождитесь Gradle sync
2. Выберите устройство / эмулятор
3. Run (зелёная кнопка)

## Примечания
- Live Coach требует разрешение камеры
- MediaPipe работает в WebView
- Для релиза: Build → Generate Signed Bundle / APK

Приложение собирается как нативный Android-контейнер над тем же React + Three.js кодом.
