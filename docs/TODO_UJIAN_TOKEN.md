# To-Do: Alur Ujian, Struktur Pelajaran, Token Berbayar

## 1. Cek alur ujian
Pembuatan soal, pembuatan ujian, dan proses ujian harus lancar dan tidak saling bentrok.

- [ ] Alur admin MSAT: soal, ujian, mulai, istirahat, selesai, rilis hasil
- [ ] Alur guru: bank soal (TP), jadwal ujian, token kelas, rekap
- [ ] Alur siswa/peserta: masuk dengan kode atau token, kerjakan, hasil
- [ ] Catat konflik yang ditemukan dan perbaiki

## 2. Struktur pelajaran tidak wajib
Pembuatan materi, soal, dan ujian tidak boleh terhambat karena struktur pelajaran (taxonomy) belum dibuat.

- [ ] Pemilih struktur pelajaran jadi opsional di formulir
- [ ] Server tidak menolak materi, soal, atau ujian tanpa struktur
- [ ] Filter dan daftar tetap jalan untuk konten tanpa struktur

## 3. Token berbayar dengan saklar admin
Token ujian bisa diubah menjadi berbayar. Admin dapat menyalakan dan mematikan sistemnya.

- [ ] Pengaturan `tokenPaywall` (nyala/mati) disimpan di server, bawaan mati
- [ ] Tombol nyala/mati di halaman admin
- [ ] Pop up konfirmasi sebelum mengubah
- [ ] Log setiap perubahan: siapa, kapan, dari apa ke apa, alasan
- [ ] Riwayat perubahan terlihat di halaman admin
- [ ] Saat nyala: join ujian MSAT mengurangi 1 token dan ditolak jika saldo kurang
- [ ] Saat mati: perilaku seperti sekarang (tanpa potongan)
- [ ] Menu token peserta mengikuti status saklar
