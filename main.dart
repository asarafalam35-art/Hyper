import 'package:flutter/material.dart';

void main() => runApp(const HyperApp());

class HyperApp extends StatelessWidget {
  const HyperApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Hyper',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0B0F),
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.purple, brightness: Brightness.dark),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final email = TextEditingController();
    final password = TextEditingController();

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('HYPER', style: TextStyle(fontSize: 38, fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              const Text('Connect. Share. Discover.', style: TextStyle(color: Colors.white60)),
              const SizedBox(height: 45),
              TextField(controller: email, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
              const SizedBox(height: 14),
              TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeShell())),
                  child: const Text('Log in'),
                ),
              ),
              const SizedBox(height: 14),
              TextButton(onPressed: () {}, child: const Text('Create new account')),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  final pages = const [FeedPage(), SearchPage(), CreatePage(), ActivityPage(), ProfilePage()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.add_box_outlined), label: 'Post'),
          NavigationDestination(icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Activity'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class FeedPage extends StatelessWidget {
  const FeedPage({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        const SliverAppBar(
          pinned: true,
          title: Text('HYPER', style: TextStyle(fontWeight: FontWeight.w900)),
          actions: [Padding(padding: EdgeInsets.only(right: 16), child: Icon(Icons.chat_bubble_outline))],
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 110,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(12),
              itemCount: 8,
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 7),
                child: Column(
                  children: [
                    CircleAvatar(radius: 30, child: Text('${i + 1}')),
                    const SizedBox(height: 6),
                    Text(i == 0 ? 'Your story' : 'User ${i + 1}', style: const TextStyle(fontSize: 11)),
                  ],
                ),
              ),
            ),
          ),
        ),
        SliverList.builder(
          itemCount: 5,
          itemBuilder: (_, i) => const PostCard(),
        ),
      ],
    );
  }
}

class PostCard extends StatefulWidget {
  const PostCard({super.key});
  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  bool liked = false;
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 18),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ListTile(leading: CircleAvatar(child: Icon(Icons.person)), title: Text('hyper_user'), subtitle: Text('Today')),
          AspectRatio(
            aspectRatio: 1,
            child: Container(
              color: Colors.deepPurple.shade800,
              alignment: Alignment.center,
              child: const Icon(Icons.image, size: 80, color: Colors.white38),
            ),
          ),
          Row(
            children: [
              IconButton(onPressed: () => setState(() => liked = !liked), icon: Icon(liked ? Icons.favorite : Icons.favorite_border, color: liked ? Colors.red : null)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.chat_bubble_outline)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.send_outlined)),
              const Spacer(),
              IconButton(onPressed: () {}, icon: const Icon(Icons.bookmark_border)),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(liked ? '1 like' : 'Be the first to like this'),
          ),
        ],
      ),
    );
  }
}

class SearchPage extends StatelessWidget {
  const SearchPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: SafeArea(child: Padding(padding: EdgeInsets.all(16), child: Column(children: [TextField(decoration: InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search', border: OutlineInputBorder())), SizedBox(height: 20), Expanded(child: Center(child: Text('Explore')))]))));
}

class CreatePage extends StatelessWidget {
  const CreatePage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.add_photo_alternate_outlined, size: 80), const SizedBox(height: 15), const Text('Create a new post'), const SizedBox(height: 15), FilledButton(onPressed: () {}, child: const Text('Choose photo/video'))])));
}

class ActivityPage extends StatelessWidget {
  const ActivityPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: SafeArea(child: Padding(padding: EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Activity', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold)), SizedBox(height: 25), Text('No new notifications yet.')])));
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Row(children: [CircleAvatar(radius: 42, child: Icon(Icons.person, size: 42)), SizedBox(width: 22), Expanded(child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [Stat('12', 'Posts'), Stat('245', 'Followers'), Stat('180', 'Following')]))]),
          const SizedBox(height: 20),
          const Text('Hyper User', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const Text('Welcome to my Hyper profile.'),
          const SizedBox(height: 18),
          OutlinedButton(onPressed: () {}, child: const Text('Edit profile')),
          const SizedBox(height: 15),
          GridView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: 9, gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 3, mainAxisSpacing: 3), itemBuilder: (_, i) => Container(color: Colors.white12, child: const Icon(Icons.image, color: Colors.white24))),
        ],
      ),
    ),
  );
}

class Stat extends StatelessWidget {
  final String number, label;
  const Stat(this.number, this.label, {super.key});
  @override
  Widget build(BuildContext context) => Column(children: [Text(number, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)), Text(label, style: const TextStyle(color: Colors.white60))]);
}
