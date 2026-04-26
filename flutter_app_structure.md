# Flutter Loan Management App Structure

## Project Structure
```
lib/
├── main.dart
├── models/
│   ├── user.dart
│   ├── employee.dart
│   ├── customer.dart
│   ├── loan.dart
│   ├── repayment.dart
│   └── collection.dart
├── services/
│   ├── supabase_service.dart
│   └── auth_service.dart
├── screens/
│   ├── login_screen.dart
│   ├── dashboard_screen.dart
│   ├── loan_management_screen.dart
│   ├── customer_management_screen.dart
│   ├── collection_screen.dart
│   └── worker_screen.dart
├── widgets/
│   ├── loan_form.dart
│   ├── customer_form.dart
│   ├── loan_list_item.dart
│   └── custom_app_bar.dart
└── utils/
    ├── constants.dart
    └── helpers.dart
```

## Dependencies to Add in pubspec.yaml
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.0.0
  flutter_svg: ^2.0.0
  intl: ^0.19.0
  provider: ^6.0.0
  http: ^1.0.0
  shared_preferences: ^2.0.0
```

## Key Files Implementation

### 1. main.dart
```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  runApp(const LoanManagementApp());
}

class LoanManagementApp extends StatelessWidget {
  const LoanManagementApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MR Groups - Loan Management',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: const LoginScreen(),
    );
  }
}
```

### 2. models/customer.dart
```dart
class Customer {
  final String id;
  final String name;
  final String phone;
  final String address;
  final String? relationship;
  final String? aadhaarNumber;
  final String? panNumber;
  final String? additionalMobile1;
  final String? additionalMobile1Relationship;
  final String? additionalMobile2;
  final String? additionalMobile2Relationship;
  final String createdAt;

  Customer({
    required this.id,
    required this.name,
    required this.phone,
    required this.address,
    this.relationship,
    this.aadhaarNumber,
    this.panNumber,
    this.additionalMobile1,
    this.additionalMobile1Relationship,
    this.additionalMobile2,
    this.additionalMobile2Relationship,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      name: json['name'],
      phone: json['phone'],
      address: json['address'],
      relationship: json['relationship'],
      aadhaarNumber: json['aadhaar_number'],
      panNumber: json['pan_number'],
      additionalMobile1: json['additional_mobile_1'],
      additionalMobile1Relationship: json['additional_mobile_1_relationship'],
      additionalMobile2: json['additional_mobile_2'],
      additionalMobile2Relationship: json['additional_mobile_2_relationship'],
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'address': address,
      'relationship': relationship,
      'aadhaar_number': aadhaarNumber,
      'pan_number': panNumber,
      'additional_mobile_1': additionalMobile1,
      'additional_mobile_1_relationship': additionalMobile1Relationship,
      'additional_mobile_2': additionalMobile2,
      'additional_mobile_2_relationship': additionalMobile2Relationship,
      'created_at': createdAt,
    };
  }
}
```

### 3. models/loan.dart
```dart
class Loan {
  final String id;
  final String customerId;
  final double amount;
  final String status;
  final String startDate;
  final String endDate;
  final String createdAt;
  final String? loanPurpose;
  final String? teamLeaderId;
  final int? numberOfMembers;
  final int? numberOfWeeks;
  final String? customerBankName;
  final String? accountNumber;
  final String? ifscCode;
  final String? weeklyBatch;
  final String? interestRate;

  Loan({
    required this.id,
    required this.customerId,
    required this.amount,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.createdAt,
    this.loanPurpose,
    this.teamLeaderId,
    this.numberOfMembers,
    this.numberOfWeeks,
    this.customerBankName,
    this.accountNumber,
    this.ifscCode,
    this.weeklyBatch,
    this.interestRate,
  });

  factory Loan.fromJson(Map<String, dynamic> json) {
    return Loan(
      id: json['id'],
      customerId: json['customer_id'],
      amount: (json['amount'] as num).toDouble(),
      status: json['status'],
      startDate: json['start_date'],
      endDate: json['end_date'],
      createdAt: json['created_at'],
      loanPurpose: json['loan_purpose'],
      teamLeaderId: json['team_leader_id'],
      numberOfMembers: json['number_of_members'],
      numberOfWeeks: json['number_of_weeks'],
      customerBankName: json['customer_bank_name'],
      accountNumber: json['account_number'],
      ifscCode: json['ifsc_code'],
      weeklyBatch: json['weekly_batch'],
      interestRate: json['interest_rate'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer_id': customerId,
      'amount': amount,
      'status': status,
      'start_date': startDate,
      'end_date': endDate,
      'created_at': createdAt,
      'loan_purpose': loanPurpose,
      'team_leader_id': teamLeaderId,
      'number_of_members': numberOfMembers,
      'number_of_weeks': numberOfWeeks,
      'customer_bank_name': customerBankName,
      'account_number': accountNumber,
      'ifsc_code': ifscCode,
      'weekly_batch': weeklyBatch,
      'interest_rate': interestRate,
    };
  }
}
```

### 4. services/supabase_service.dart
```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/customer.dart';
import '../models/loan.dart';

class SupabaseService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Customer operations
  Future<List<Customer>> getCustomers() async {
    final response = await _supabase
        .from('customers')
        .select()
        .order('created_at', ascending: false);

    return response.map((data) => Customer.fromJson(data)).toList();
  }

  Future<Customer> addCustomer(Customer customer) async {
    final response = await _supabase.from('customers').insert(customer.toJson()).select();
    return Customer.fromJson(response.first);
  }

  Future<Customer> updateCustomer(Customer customer) async {
    final response = await _supabase
        .from('customers')
        .update(customer.toJson())
        .eq('id', customer.id)
        .select();
    return Customer.fromJson(response.first);
  }

  Future<void> deleteCustomer(String id) async {
    await _supabase.from('customers').delete().eq('id', id);
  }

  // Loan operations
  Future<List<Loan>> getLoans() async {
    final response = await _supabase
        .from('loans')
        .select('*, customer:customers(*)')
        .order('created_at', ascending: false);

    return response.map((data) => Loan.fromJson(data)).toList();
  }

  Future<Loan> addLoan(Loan loan) async {
    final response = await _supabase.from('loans').insert(loan.toJson()).select();
    return Loan.fromJson(response.first);
  }

  Future<Loan> updateLoan(Loan loan) async {
    final response = await _supabase
        .from('loans')
        .update(loan.toJson())
        .eq('id', loan.id)
        .select();
    return Loan.fromJson(response.first);
  }

  Future<void> deleteLoan(String id) async {
    await _supabase.from('loans').delete().eq('id', id);
  }
}
```

### 5. screens/login_screen.dart
```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _supabase = Supabase.instance.client;
  bool _isLoading = false;

  Future<void> _signIn() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await _supabase.auth.signInWithPassword(
        email: _emailController.text,
        password: _passwordController.text,
      );

      if (response.user != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const DashboardScreen()),
        );
      }
    } on AuthException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('An unexpected error occurred')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isLoading ? null : _signIn,
              child: _isLoading
                  ? const CircularProgressIndicator()
                  : const Text('Login'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

### 6. screens/dashboard_screen.dart
```dart
import 'package:flutter/material.dart';
import 'loan_management_screen.dart';
import 'customer_management_screen.dart';
import 'collection_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              // Handle logout
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: [
            _buildDashboardCard(
              context,
              title: 'Loans',
              icon: Icons.account_balance,
              color: Colors.blue,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const LoanManagementScreen(),
                ),
              ),
            ),
            _buildDashboardCard(
              context,
              title: 'Customers',
              icon: Icons.people,
              color: Colors.green,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CustomerManagementScreen(),
                ),
              ),
            ),
            _buildDashboardCard(
              context,
              title: 'Collections',
              icon: Icons.payment,
              color: Colors.orange,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CollectionScreen(),
                ),
              ),
            ),
            _buildDashboardCard(
              context,
              title: 'Workers',
              icon: Icons.work,
              color: Colors.purple,
              onTap: () {
                // Navigate to workers screen
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboardCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 4,
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 50, color: color),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
```

### 7. screens/loan_management_screen.dart
```dart
import 'package:flutter/material.dart';
import '../models/loan.dart';
import '../services/supabase_service.dart';
import '../widgets/loan_form.dart';
import '../widgets/loan_list_item.dart';

class LoanManagementScreen extends StatefulWidget {
  const LoanManagementScreen({super.key});

  @override
  State<LoanManagementScreen> createState() => _LoanManagementScreenState();
}

class _LoanManagementScreenState extends State<LoanManagementScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  List<Loan> _loans = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLoans();
  }

  Future<void> _loadLoans() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final loans = await _supabaseService.getLoans();
      setState(() {
        _loans = loans;
        _isLoading = false;
      });
    } catch (error) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading loans: $error')),
        );
      }
    }
  }

  Future<void> _addLoan(Loan loan) async {
    try {
      await _supabaseService.addLoan(loan);
      await _loadLoans();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Loan added successfully')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error adding loan: $error')),
        );
      }
    }
  }

  void _showAddLoanForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: LoanForm(
            onSaved: _addLoan,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Loan Management')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadLoans,
              child: ListView.builder(
                itemCount: _loans.length,
                itemBuilder: (context, index) {
                  return LoanListItem(loan: _loans[index]);
                },
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddLoanForm,
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

## Running the Flutter App

1. **Install Dependencies**:
   ```bash
   flutter pub get
   ```

2. **Configure Supabase**:
   - Update your Supabase URL and anon key in `main.dart`
   - Ensure your Supabase database has the same schema as your existing project

3. **Run the App**:
   ```bash
   flutter run
   ```

## Additional Features to Implement

1. **Authentication**: Add user login/logout functionality
2. **Data Synchronization**: Implement real-time data updates using Supabase Realtime
3. **Offline Support**: Add local data caching for offline usage
4. **Push Notifications**: Implement notifications for due dates and collections
5. **Reports**: Add charting and reporting features
6. **Localization**: Add support for multiple languages

## Deployment

1. **Android**:
   ```bash
   flutter build apk
   ```

2. **iOS** (requires Mac):
   ```bash
   flutter build ios
   ```

3. **Web**:
   ```bash
   flutter build web
   ```

This structure provides a solid foundation for your loan management app with Flutter. You can extend it further based on your specific requirements.