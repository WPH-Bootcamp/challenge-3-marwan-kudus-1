// ============================================
// HABIT TRACKER CLI - CHALLENGE 3
// ============================================
// NAMA: [Cece Sumarwa Kudus]

// KELAS: [Rep batch 3]
// TANGGAL: [ 07]
// ============================================

// TAHAP 1: SETUP PROJECT
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Konstanta
const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

// Setup readline interface untuk interaksi CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Variabel untuk menyimpan interval reminder
let reminderIntervalId = null;

// ====================================================================
// FUNGSI UTILITY
// ====================================================================

/**
 * Mengubah input pertanyaan CLI menjadi Promise
 * @param {string} question Pertanyaan yang akan ditampilkan
 * @returns {Promise<string>} Input jawaban dari user
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Mendapatkan tanggal awal minggu (Senin) dari tanggal saat ini.
 * Digunakan untuk filter mingguan.
 * @param {Date} date Tanggal referensi
 * @returns {Date} Tanggal hari Senin minggu ini pada 00:00:00
 */
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Senin selalu 1
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * @returns {string} Tanggal hari ini
 */
function getTodayDateKey() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Mengubah Date object menjadi string YYYY-MM-DD
 * @param {Date} dateObj
 * @returns {string}
 */
function formatDate(dateObj) {
  return dateObj.toISOString().split('T')[0];
}

/**
 * Membuat progress bar ASCII
 * KONSEP YANG DIGUNAKAN: for loop
 * @param {number} percentage Persentase (0-100)
 * @returns {string} Progress bar ASCII
 */
function createProgressBar(percentage) {
  const BAR_LENGTH = 20;
  const filledCount = Math.floor(percentage / (100 / BAR_LENGTH));
  const emptyCount = BAR_LENGTH - filledCount;

  // Menggunakan for loop untuk membangun string bar
  let bar = '';
  for (let i = 0; i < filledCount; i++) {
    bar += '█';
  }
  for (let i = 0; i < emptyCount; i++) {
    bar += '░';
  }

  return bar;
}

// ====================================================================
// TAHAP 2: BUAT USER PROFILE OBJECT
// KONSEP YANG DIGUNAKAN: Objek Dasar, Date
// ====================================================================
const userProfile = {
  name: 'Pelacak Kebiasaan Pengguna',
  memberSince: new Date().toISOString(),
  totalHabitsCreated: 0,
  totalCompletions: 0,
  lastUpdate: new Date().toISOString(),

  /**
   * Memperbarui statistik global.
   * @param {'create'|'complete'|'delete'} type Jenis pembaruan
   */
  updateStats(type) {
    this.lastUpdate = new Date().toISOString();
    if (type === 'create') {
      this.totalHabitsCreated += 1;
    } else if (type === 'complete') {
      this.totalCompletions += 1;
    }
  },

  /**
   * Menghitung berapa hari user telah bergabung.
   * @returns {number} Jumlah hari
   */
  getDaysJoined() {
    const now = new Date();
    const since = new Date(this.memberSince);
    const diffTime = Math.abs(now - since);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },
};

// ====================================================================
// TAHAP 3: BUAT HABIT CLASS
// KONSEP YANG DIGUNAKAN: Class, Array, Date, filter(), find()
// ====================================================================
class Habit {
  /**
   * @param {number} id
   * @param {string} name
   * @param {number} targetFrequency Target per minggu
   * @param {string[]} [completions=[]] Array string tanggal YYYY-MM-DD
   * @param {string} [createdAt=new Date().toISOString()]
   */
  constructor(
    id,
    name,
    targetFrequency,
    completions = [],
    createdAt = new Date().toISOString()
  ) {
    this.id = id;
    this.name = name;
    this.targetFrequency = targetFrequency;
    this.completions = completions; // Array of YYYY-MM-DD strings
    this.createdAt = createdAt;
  }

  /**
   * Menandai kebiasaan selesai untuk hari ini.
   * KONSEP YANG DIGUNAKAN: Date, Array find()
   */
  markComplete() {
    const todayKey = getTodayDateKey();
    // Cek apakah sudah selesai hari ini
    const isAlreadyDone = this.completions.find((date) => date === todayKey); // KONSEP find()

    if (!isAlreadyDone) {
      this.completions.push(todayKey);
      return true;
    }
    return false;
  }

  /**
   * Mendapatkan daftar tanggal selesai yang terjadi di minggu ini.
   * KONSEP YANG DIGUNAKAN: Date, Array filter()
   * @returns {string[]}
   */
  getThisWeekCompletions() {
    const startOfWeek = getStartOfWeek(new Date());
    // KONSEP filter()
    return this.completions.filter((dateStr) => {
      const completionDate = new Date(dateStr);
      // Bandingkan tanggal selesai dengan tanggal awal minggu
      return completionDate >= startOfWeek;
    });
  }

  /**
   * Cek apakah kebiasaan ini sudah selesai hari ini.
   * KONSEP YANG DIGUNAKAN: Array find()
   * @returns {boolean}
   */
  isCompletedToday() {
    const todayKey = getTodayDateKey();
    // KONSEP find()
    return !!this.completions.find((date) => date === todayKey);
  }

  /**
   * Menghitung persentase progress minggu ini.
   * @returns {number} Persentase 0-100
   */
  getProgressPercentage() {
    const completionsCount = this.getThisWeekCompletions().length;
    const target = this.targetFrequency;

    if (target <= 0) return 100;

    const percentage = (completionsCount / target) * 100;
    return Math.min(100, Math.round(percentage));
  }

  /**
   * Mendapatkan status kebiasaan (Aktif/Selesai).
   * @returns {string}
   */
  getStatus() {
    return this.getThisWeekCompletions().length >= this.targetFrequency
      ? 'Selesai'
      : 'Aktif';
  }

  /**
   * Serialisasi data ke object sederhana untuk JSON
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      targetFrequency: this.targetFrequency,
      completions: this.completions,
      createdAt: this.createdAt,
    };
  }

  /**
   * Membuat instance Habit dari object data mentah
   * @param {Object} data
   * @returns {Habit}
   */
  static fromObject(data) {
    // KONSEP Nullish coalescing operator (??)
    return new Habit(
      data.id,
      data.name,
      data.targetFrequency ?? 1, // Default target 1 jika null/undefined
      data.completions ?? [], // Default array kosong jika null/undefined
      data.createdAt
    );
  }
}

// ====================================================================
// TAHAP 4: BUAT HABIT TRACKER CLASS (UTAMA)
// KONSEP YANG DIGUNAKAN: Class, Array, filter(), map(), forEach(), Date, setInterval, JSON, Nullish coalescing, while, for
// ====================================================================
class HabitTracker {
  constructor() {
    this.habits = []; // KONSEP Array (List data)
    this.userProfile = userProfile;
    this.nextId = 1;
    this.loadFromFile();
  }

  // --- FILE OPERATIONS ---

  /**
   * Menyimpan data ke file JSON.
   * KONSEP YANG DIGUNAKAN: JSON.stringify
   */
  saveToFile() {
    try {
      const dataToSave = {
        habits: this.habits.map((h) => h.toObject()), // KONSEP Array map()
        userProfile: this.userProfile,
        nextId: this.nextId,
      };
      const jsonData = JSON.stringify(dataToSave, null, 2); // KONSEP JSON.stringify
      fs.writeFileSync(DATA_FILE, jsonData, 'utf8');
    } catch (error) {
      console.error('\n[!!] GAGAL menyimpan data ke file:', error.message);
    }
  }

  /**
   * Memuat data dari file JSON.
   * KONSEP YANG DIGUNAKAN: JSON.parse, Nullish coalescing operator (??)
   */
  loadFromFile() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const jsonData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(jsonData); // KONSEP JSON.parse

        // KONSEP Nullish coalescing operator (??) - digunakan untuk fallback data
        this.nextId = data.nextId ?? 1;

        // Memuat userProfile, jika tidak ada, gunakan default
        Object.assign(this.userProfile, data.userProfile ?? userProfile);

        // Memuat habits
        this.habits = (data.habits ?? []).map((hData) =>
          Habit.fromObject(hData)
        );
      }
    } catch (error) {
      console.warn(
        '\n[!] GAGAL memuat data atau file korup. Memulai dengan data kosong.'
      );
      this.habits = [];
      this.nextId = 1;
      Object.assign(this.userProfile, userProfile);
    }
  }

  // --- CRUD OPERATIONS ---

  /**
   * Menambah kebiasaan baru.
   */
  addHabit(name, frequency) {
    const newHabit = new Habit(this.nextId++, name, parseInt(frequency));
    this.habits.push(newHabit);
    this.userProfile.updateStats('create');
    this.saveToFile();
    console.log(
      `\n[OK] Kebiasaan "${name}" ditambahkan dengan Target ${frequency}x/minggu.`
    );
  }

  /**
   * Menandai kebiasaan selesai untuk hari ini.
   */
  completeHabit(index) {
    // KONSEP Nullish coalescing operator (??)
    const habit = this.habits[index - 1] ?? null;

    if (!habit) {
      console.log('\n[!!] Indeks kebiasaan tidak valid.');
      return;
    }

    if (habit.markComplete()) {
      this.userProfile.updateStats('complete');
      this.saveToFile();
      console.log(
        `\n[OK] Kebiasaan "${habit.name}" ditandai selesai untuk hari ini (${getTodayDateKey()}).`
      );
    } else {
      console.log(`\n[!!] Kebiasaan "${habit.name}" sudah selesai hari ini!`);
    }
  }

  /**
   * Menghapus kebiasaan.
   */
  deleteHabit(index) {
    const habitIndex = index - 1;
    const deletedHabits = this.habits.splice(habitIndex, 1);

    if (deletedHabits.length > 0) {
      this.saveToFile();
      console.log(
        `\n[OK] Kebiasaan "${deletedHabits[0].name}" berhasil dihapus.`
      );
    } else {
      console.log('\n[!!] Indeks kebiasaan tidak valid.');
    }
  }

  // --- DISPLAY METHODS ---

  /**
   * Fungsi utama untuk menampilkan daftar kebiasaan.
   * @param {null|'active'|'completed'} filter Filter kebiasaan
   * @param {boolean} useForLoop Jika true, gunakan for loop (untuk menu 9)
   */
  displayHabits(filter = null, useForLoop = false) {
    let listToDisplay = this.habits;

    if (filter === 'active') {
      // KONSEP Array filter()
      listToDisplay = this.habits.filter((h) => h.getStatus() === 'Aktif');
      console.log('\n==================================================');
      console.log('DAFTAR KEBIASAAN AKTIF');
      console.log('==================================================');
    } else if (filter === 'completed') {
      // KONSEP Array filter()
      listToDisplay = this.habits.filter((h) => h.getStatus() === 'Selesai');
      console.log('\n==================================================');
      console.log('DAFTAR KEBIASAAN SELESAI MINGGU INI');
      console.log('==================================================');
    } else {
      console.log('\n==================================================');
      console.log('DAFTAR SEMUA KEBIASAAN');
      console.log('==================================================');
    }

    if (listToDisplay.length === 0) {
      console.log('[!] Tidak ada kebiasaan yang terdaftar atau sesuai filter.');
      console.log('==================================================');
      return;
    }

    // Tampilkan daftar kebiasaan
    if (useForLoop) {
      this._displayHabitsUsingForLoop(listToDisplay); // KONSEP for loop
    } else {
      // KONSEP forEach() (default)
      listToDisplay.forEach((habit, index) => {
        const completions = habit.getThisWeekCompletions().length;
        const percentage = habit.getProgressPercentage();
        const progressBar = createProgressBar(percentage);

        console.log(`${index + 1}. [${habit.getStatus()}] ${habit.name}`);
        console.log(`   Target: ${habit.targetFrequency}x/minggu`);
        console.log(
          `   Progress: ${completions}/${habit.targetFrequency} (${percentage}%)`
        );
        console.log(`   Progress Bar: ${progressBar} ${percentage}%`);
        if (habit.isCompletedToday()) {
          console.log(`   *SELESAI HARI INI*`);
        }
        console.log('');
      });
    }
    console.log('==================================================');
  }

  /**
   * Demonstrasi while loop untuk menampilkan kebiasaan.
   * KONSEP YANG DIGUNAKAN: while loop
   */
  _displayHabitsUsingWhileLoop() {
    console.log('\n==================================================');
    console.log('DEMO LOOP: MENAMPILKAN DENGAN WHILE LOOP');
    console.log('==================================================');
    let i = 0;
    // KONSEP while loop
    while (i < this.habits.length) {
      const habit = this.habits[i];
      const completions = habit.getThisWeekCompletions().length;
      console.log(
        `[While Loop] ${i + 1}. ${habit.name} (${completions}/${habit.targetFrequency})`
      );
      i++;
    }
    console.log('==================================================');
  }

  /**
   * Demonstrasi for loop untuk menampilkan kebiasaan (dipanggil dari displayHabits).
   * KONSEP YANG DIGUNAKAN: for loop
   */
  _displayHabitsUsingForLoop(list) {
    console.log('\n==================================================');
    console.log('DEMO LOOP: MENAMPILKAN DENGAN FOR LOOP');
    console.log('==================================================');
    // KONSEP for loop
    for (let i = 0; i < list.length; i++) {
      const habit = list[i];
      const completions = habit.getThisWeekCompletions().length;
      const percentage = habit.getProgressPercentage();
      const progressBar = createProgressBar(percentage);

      console.log(`[For Loop] ${i + 1}. [${habit.getStatus()}] ${habit.name}`);
      console.log(
        `   Progress: ${completions}/${habit.targetFrequency} (${percentage}%)`
      );
      console.log(`   Progress Bar: ${progressBar} ${percentage}%`);
      console.log('');
    }
    console.log('==================================================');
  }

  /**
   * Menampilkan profil user dan statistik dasar.
   * KONSEP YANG DIGUNAKAN: Objek Dasar, Date
   */
  displayProfile() {
    console.log('\n==================================================');
    console.log('PROFIL PENGGUNA DAN STATISTIK');
    console.log('==================================================');
    console.log(`Nama Pengguna: ${this.userProfile.name}`);
    console.log(
      `Bergabung Sejak: ${formatDate(new Date(this.userProfile.memberSince))}`
    );
    console.log(`Hari Bergabung: ${this.userProfile.getDaysJoined()} hari`);
    console.log(
      `Total Kebiasaan Dibuat: ${this.userProfile.totalHabitsCreated}`
    );
    console.log(
      `Total Penyelesaian Global: ${this.userProfile.totalCompletions}`
    );
    console.log(`Kebiasaan Saat Ini: ${this.habits.length}`);
    console.log('==================================================');
  }

  /**
   * Menampilkan ringkasan statistik menggunakan Array Methods.
   * KONSEP YANG DIGUNAKAN: Array map(), Array filter(), Array forEach()
   */
  displayStats() {
    console.log('\n==================================================');
    console.log('STATISTIK RINGKAS');
    console.log('==================================================');

    if (this.habits.length === 0) {
      console.log('[!] Belum ada kebiasaan yang terdaftar untuk dianalisis.');
      console.log('==================================================');
      return;
    }

    // KONSEP Array map() untuk mendapatkan nama kebiasaan
    const habitNames = this.habits.map((h) => h.name);
    console.log(`Daftar Kebiasaan: ${habitNames.join(', ')}\n`);

    // KONSEP Array filter() untuk menghitung kebiasaan aktif/selesai
    const completedThisWeek = this.habits.filter(
      (h) => h.getStatus() === 'Selesai'
    ).length;
    const activeThisWeek = this.habits.length - completedThisWeek;
    console.log(
      `Kebiasaan Selesai Minggu Ini: ${completedThisWeek} (${((completedThisWeek / this.habits.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `Kebiasaan Aktif Minggu Ini: ${activeThisWeek} (${((activeThisWeek / this.habits.length) * 100).toFixed(1)}%)`
    );
    console.log('');

    console.log('Progress Setiap Kebiasaan:');
    // KONSEP Array forEach() untuk menampilkan detail
    this.habits.forEach((habit) => {
      const percentage = habit.getProgressPercentage();
      const completions = habit.getThisWeekCompletions().length;
      console.log(
        `- ${habit.name}: ${completions}/${habit.targetFrequency} (${percentage}%)`
      );
    });

    console.log('==================================================');
  }

  // --- REMINDER SYSTEM ---

  /**
   * Memulai sistem reminder otomatis.
   * KONSEP YANG DIGUNAKAN: setInterval
   */
  startReminder() {
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
    }
    // KONSEP setInterval
    reminderIntervalId = setInterval(() => {
      this.showReminder();
    }, REMINDER_INTERVAL);
    // console.log(`[LOG] Reminder diaktifkan setiap ${REMINDER_INTERVAL / 1000} detik.`);
  }

  /**
   * Menampilkan pesan reminder untuk kebiasaan yang belum selesai hari ini.
   * KONSEP YANG DIGUNAKAN: Array filter(), Array map()
   */
  showReminder() {
    // KONSEP Array filter()
    const uncompletedHabits = this.habits.filter((h) => !h.isCompletedToday());

    if (uncompletedHabits.length > 0) {
      // KONSEP Array map()
      const habitNames = uncompletedHabits.map((h) => `"${h.name}"`);
      console.log('\n==================================================');
      console.log(`REMINDER: Jangan lupa selesaikan ${habitNames.join(', ')}!`);
      console.log('==================================================');
      this.displayMenu(); // Tampilkan menu lagi setelah reminder
    }
  }

  /**
   * Menghentikan reminder.
   */
  stopReminder() {
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
      reminderIntervalId = null;
    }
  }
}

// ====================================================================
// TAHAP 5: CLI INTERFACE
// ====================================================================

/**
 * Menampilkan menu utama.
 */
function displayMenu() {
  console.log('\n==================================================');
  console.log('HABIT TRACKER - MENU UTAMA');
  console.log('==================================================');
  console.log('1. Lihat Profil');
  console.log('2. Lihat Semua Kebiasaan');
  console.log('3. Lihat Kebiasaan Aktif (Mingguan)');
  console.log('4. Lihat Kebiasaan Selesai (Mingguan)');
  console.log('5. Tambah Kebiasaan Baru');
  console.log('6. Tandai Kebiasaan Selesai (Hari Ini)');
  console.log('7. Hapus Kebiasaan');
  console.log('8. Lihat Statistik');
  console.log('9. Demo Loop (while/for)');
  console.log('0. Keluar');
  console.log('==================================================');
}

/**
 * Menangani input menu dari user.
 * @param {HabitTracker} tracker Instance HabitTracker
 */
async function handleMenu(tracker) {
  displayMenu();
  const choice = await askQuestion('Pilih menu (0-9): ');

  switch (choice) {
    case '1':
      tracker.displayProfile();
      break;
    case '2':
      tracker.displayHabits();
      break;
    case '3':
      tracker.displayHabits('active');
      break;
    case '4':
      tracker.displayHabits('completed');
      break;
    case '5':
      console.log('\n--- TAMBAH KEBIASAAN BARU ---');
      const name = await askQuestion('Nama Kebiasaan: ');
      let frequency = await askQuestion('Target per minggu (angka, e.g., 5): ');
      frequency = parseInt(frequency);
      if (name && !isNaN(frequency) && frequency > 0) {
        tracker.addHabit(name, frequency);
      } else {
        console.log('\n[!!] Input nama dan frekuensi target tidak valid.');
      }
      break;
    case '6':
      tracker.displayHabits();
      if (tracker.habits.length > 0) {
        const index = await askQuestion(
          'Masukkan nomor kebiasaan yang selesai hari ini: '
        );
        tracker.completeHabit(parseInt(index));
      } else {
        console.log('\n[!!] Belum ada kebiasaan untuk diselesaikan.');
      }
      break;
    case '7':
      tracker.displayHabits();
      if (tracker.habits.length > 0) {
        const index = await askQuestion(
          'Masukkan nomor kebiasaan yang akan dihapus: '
        );
        tracker.deleteHabit(parseInt(index));
      } else {
        console.log('\n[!!] Belum ada kebiasaan untuk dihapus.');
      }
      break;
    case '8':
      tracker.displayStats();
      break;
    case '9':
      // Demonstrasi while loop dan for loop
      if (tracker.habits.length > 0) {
        tracker._displayHabitsUsingWhileLoop(); // Demo While Loop
        tracker.displayHabits(null, true); // Demo For Loop
      } else {
        console.log(
          '\n[!!] Tambahkan kebiasaan terlebih dahulu untuk demo loop.'
        );
      }
      break;
    case '0':
      tracker.stopReminder();
      rl.close();
      console.log(
        '\n[INFO] Terima kasih telah menggunakan Habit Tracker. Data Anda telah disimpan.'
      );
      process.exit(0);
      return;
    default:
      console.log('\n[!!] Pilihan menu tidak valid. Silakan coba lagi.');
      break;
  }

  // Lanjutkan ke menu berikutnya setelah aksi selesai
  await handleMenu(tracker);
}

// ====================================================================
// TAHAP 6: MAIN FUNCTION
// ====================================================================
async function main() {
  console.clear();
  console.log('**************************************************');
  console.log('   SELAMAT DATANG DI HABIT TRACKER CLI v1.0');
  console.log('   Dibuat untuk demonstrasi konsep JavaScript');
  console.log('**************************************************');

  const tracker = new HabitTracker();
  tracker.startReminder(); // Aktifkan sistem reminder

  // Tambah data demo jika kosong
  if (tracker.habits.length === 0) {
    console.log('\n[INFO] Menambahkan data demo untuk memulai.');
    tracker.addHabit('Minum Air 8 Gelas', 7);
    tracker.addHabit('Baca Buku 30 Menit', 5);
    tracker.addHabit('Olahraga 1 Jam', 3);
    console.log('\n[INFO] Data demo siap digunakan.');
  } else {
    console.log(
      `\n[INFO] Data dimuat. Terdapat ${tracker.habits.length} kebiasaan.`
    );
  }

  // Mulai interaksi menu
  await handleMenu(tracker);
}

// Jalankan aplikasi
main();

// Tambahkan handler untuk memastikan rl.close() dipanggil saat process.exit
rl.on('close', () => process.exit(0));
