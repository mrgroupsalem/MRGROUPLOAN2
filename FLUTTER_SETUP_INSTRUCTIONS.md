# Flutter App Setup Instructions for Loan Management System

## Step 1: Install Flutter

1. **Download Flutter SDK**
   - Visit [Flutter's official website](https://docs.flutter.dev/get-started/install)
   - Download the SDK for Windows
   - Extract to a desired location (e.g., `C:\src\flutter`)

2. **Update System PATH**
   - Open System Properties → Advanced → Environment Variables
   - Add `C:\src\flutter\bin` to your PATH variable
   - Restart your command prompt/terminal

3. **Verify Installation**
   ```bash
   flutter --version
   ```

## Step 2: Set Up Development Environment

1. **Install Android Studio**
   - Download from [Android Developer website](https://developer.android.com/studio)
   - Install with default settings
   - Install Flutter and Dart plugins from Android Studio settings

2. **Set Up Android Device**
   - Enable Developer Options and USB Debugging on your Android phone
   - Connect via USB to your computer
   - Or set up Android Emulator through Android Studio

## Step 3: Create New Flutter Project

1. **Create Project**
   ```bash
   flutter create loan_management_app
   cd loan_management_app
   ```

2. **Open in IDE**
   - Open the project in Android Studio or VS Code
   - Install recommended plugins if prompted

## Step 4: Add Dependencies

1. **Update pubspec.yaml**
   Add these dependencies under `dependencies`:
   ```yaml
   dependencies:
     flutter:
       sdk: flutter
     supabase_flutter: ^2.3.0
     flutter_svg: ^2.0.9
     intl: ^0.19.0
     provider: ^6.1.1
   ```

2. **Install Dependencies**
   ```bash
   flutter pub get
   ```

## Step 5: Configure Supabase Integration

1. **Update main.dart**
   ```dart
   import 'package:flutter/material.dart';
   import 'package:supabase_flutter/supabase_flutter.dart';
   
   Future<void> main() async {
     WidgetsFlutterBinding.ensureInitialized();
     
     await Supabase.initialize(
       url: 'https://your-project.supabase.co',
       anonKey: 'your-anon-key',
     );
     
     runApp(const MyApp());
   }
   
   class MyApp extends StatelessWidget {
     const MyApp({super.key});
   
     @override
     Widget build(BuildContext context) {
       return MaterialApp(
         title: 'Loan Management',
         theme: ThemeData(
           primarySwatch: Colors.blue,
         ),
         home: const HomeScreen(),
       );
     }
   }
   
   class HomeScreen extends StatelessWidget {
     const HomeScreen({super.key});
   
     @override
     Widget build(BuildContext context) {
       return Scaffold(
         appBar: AppBar(title: const Text('Loan Management')),
         body: const Center(
           child: Text('Welcome to Loan Management App'),
         ),
       );
     }
   }
   ```

## Step 6: Test the App

1. **Connect Device or Start Emulator**
   - Ensure you have an Android device connected or emulator running

2. **Run the App**
   ```bash
   flutter run
   ```

## Step 7: Develop Features

Using the detailed structure in `flutter_app_structure.md` as reference:

1. **Create Models** for your data types (Customer, Loan, etc.)
2. **Implement Services** to connect to your Supabase backend
3. **Build Screens** for different functionalities
4. **Add Widgets** for reusable UI components

## Troubleshooting

1. **If Flutter command not found**:
   - Ensure PATH is correctly set
   - Restart your terminal/command prompt

2. **If Android licenses not accepted**:
   ```bash
   flutter doctor --android-licenses
   ```

3. **If build fails**:
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

## Next Steps

1. Implement authentication
2. Create CRUD operations for loans and customers
3. Add data synchronization with your existing Supabase database
4. Implement offline capabilities
5. Add reporting and analytics features

This setup will give you a working Flutter app that you can extend with the features from your existing loan management system.