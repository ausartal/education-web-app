# To-Do: Alur Ujian, Struktur Pelajaran, Token Berbayar

## 1. Cek alur ujian
Pembuatan soal, pembuatan ujian, dan proses ujian harus lancar dan tidak saling bentrok.

- [x] Alur admin MSAT: soal, ujian, mulai, istirahat, selesai, rilis hasil
- [x] Alur guru: bank soal (TP), jadwal ujian, token kelas, rekap
- [x] Alur siswa/peserta: masuk dengan kode atau token, kerjakan, hasil
- [x] Catat konflik yang ditemukan dan perbaiki

## 2. Struktur pelajaran tidak wajib
Pembuatan materi, soal, dan ujian tidak boleh terhambat karena struktur pelajaran (taxonomy) belum dibuat.

- [x] Pemilih struktur pelajaran jadi opsional di formulir
- [x] Server tidak menolak materi, soal, atau ujian tanpa struktur
- [x] Filter dan daftar tetap jalan untuk konten tanpa struktur

## 3. Token berbayar dengan saklar admin
Token ujian bisa diubah menjadi berbayar. Admin dapat menyalakan dan mematikan sistemnya.

- [x] Pengaturan `tokenPaywall` (nyala/mati) disimpan di server, bawaan mati
- [x] Tombol nyala/mati di halaman admin
- [x] Pop up konfirmasi sebelum mengubah
- [x] Log setiap perubahan: siapa, kapan, dari apa ke apa, alasan
- [x] Riwayat perubahan terlihat di halaman admin
- [x] Saat nyala: join ujian MSAT mengurangi 1 token dan ditolak jika saldo kurang
- [x] Saat mati: perilaku seperti sekarang (tanpa potongan)
- [x] Menu token peserta mengikuti status saklar

## Temuan konflik alur ujian (sudah diperbaiki)
- Soal yang diajukan ke publik (menunggu persetujuan) hilang dari ujian guru pemiliknya sendiri; pemilik soal sekarang selalu bisa memakainya
- Dua soal pada tingkat yang sama dalam satu topik: soal yang muncul bergantung urutan database dan bisa berbeda setelah refresh; sekarang urutan tetap dan soal dikunci lewat `questionIds` sesi
- Menghapus atau menonaktifkan soal terakhir sebuah tingkat saat ujian topik aktif membuat ujian gagal untuk siswa; sekarang ditolak dengan pesan jelas
- Menghapus soal MSAT yang dipakai ujian merusak ujian dan hasil; sekarang ditolak, soal disarankan dinonaktifkan
- Halaman guru mengabaikan error dari server saat hapus, ubah status, dan simpan soal; sekarang pesannya tampil
- Admin yang membuat ujian dengan soal privat guru lain: soal itu tidak terlihat siswa saat mulai (belum diubah, kasus langka)
