# AKURAT — To-Do Perbaikan Alur

Hasil audit alur siswa, peserta exam, guru, dan admin. Urutan mengikuti prioritas.
Semua temuan berasal dari pembacaan kode, belum diuji langsung di database.

## P0 — Keamanan data (`src/app/api/data/[...path]/route.ts`)

Aturan akses yang berlaku adalah `COLLECTION_ACCESS`, bukan `firestore.rules`.

- [x] `exam_schedules`: batasi baca ke guru pemilik dan admin; siswa tidak boleh melihat `examToken` dan `customQuestions`
- [x] `classes`: sembunyikan `joinCode` dan `studentIds` dari siswa yang bukan anggota
- [x] `messages`: baca hanya untuk pengirim dan penerima
- [x] `class_messages`: baca hanya untuk anggota kelas dan guru kelas
- [x] `notifications`: baca hanya milik sendiri (saat ini list tidak difilter per user)
- [x] `assignments`: siswa hanya melihat submission miliknya
- [x] `msat_sessions`: proteksi `resultsReleasedAt`, `resultsReleasedBy`, `stageResponses`, `stagePath`, `currentStage`, `currentStageDifficulty`, `breakStartedAt`, `breakEndsAt`, `anomalyFlags`, `peringkat`, `predikat`
- [~] `exam_sessions` dan `quiz_results`: `exam_sessions` sudah admin-only untuk tulis; `quiz_results` masih bisa ditulis pemilik
- [x] `exam_certificates`: samakan `ownerField` dengan field yang dipakai (`userId`)
- [x] Tambah test untuk `COLLECTION_ACCESS` (baca/tulis per role)
- [x] Bersihkan atau tandai `firestore.rules` agar tidak menyesatkan

## P1 — Alur ujian MSAT

### Join dan sesi
- [x] `api/msat/join`: tolak join ulang jika sudah ada sesi `completed` untuk exam yang sama
- [x] Buat sesi dan naikkan `currentUses` secara atomic (transaksi), cegah sesi ganda dan overrun `maxUses`
- [ ] Putuskan perilaku token: aktifkan pengurangan token atau sembunyikan menu Token sampai pembayaran siap (menunggu keputusan)

### Soal dan penilaian
- [x] Simpan daftar soal per stage di sesi saat pertama kali diambil; `/questions` mengembalikan set yang sama
- [x] `submit-stage`: validasi `questionId` milik stage dan sesi itu, tolak duplikat, cocokkan domain
- [x] Jangan isi jawaban kosong dengan `'A'`; simpan sebagai tidak dijawab
- [x] Validasi jumlah soal aktif per domain saat admin membuat ujian (minimal 4 per domain per tingkat)
- [x] Tampilkan pesan jelas jika soal kurang dari 12

### Timer
- [x] Simpan `stageStartedAt` dan `stageEndsAt` di server (disimpan di `stageState` pada sesi)
- [x] `submit-stage` menolak atau menandai pengiriman setelah waktu habis (beri toleransi kecil)
- [x] Hentikan pemulihan timer dari `localStorage`; hitung sisa waktu dari server
- [x] Hapus reset timer ke durasi penuh saat sisa waktu tersimpan 0

### Pemulihan setelah refresh
- [x] Pulihkan jawaban dan soal dari set yang sama (lihat daftar soal di sesi)
- [x] Simpan jawaban sementara ke server secara berkala, bukan hanya `localStorage`

### Istirahat
- [x] Otomatis ubah `on_break` menjadi `in_progress` saat `breakEndsAt` lewat (saat sesi dibaca atau lewat job)
- [x] Progress bar istirahat memakai durasi dari konfigurasi ujian, bukan 600 detik tetap
- [x] Ganti `breakState` tunggal di waiting room dengan data per sesi

### Terminasi dan error
- [x] Hitung pelanggaran tab di server; tambah status `terminated` (status akhir tetap `completed` dengan `terminated: true`)
- [x] Peserta yang terminasi tidak bisa masuk lagi ke sesi yang sama
- [x] Tampilkan error saat submit gagal dan sediakan tombol coba lagi
- [x] Hindari `catch { /* ignore */ }` pada alur submit dan complete

### Sertifikat
- [x] Nomor sertifikat dari counter atomic, bukan `count + 1`
- [x] Hindari membaca semua sertifikat tahun berjalan hanya untuk menghitung urutan

## P2 — Akun dan autentikasi

- [x] Satu aturan untuk akun yang punya profil sekolah dan profil exam: claim `role` = peran sekolah; identitas Exam dari dokumen `exam_users`
- [x] `exam/auth/sync-claim`: jangan menimpa role `teacher` atau `admin`
- [x] `ExamAuthGuard`: pastikan profil `exam_users` ada, arahkan ke pelengkapan profil jika belum
- [x] Login sekolah: tangani akun yang hanya punya profil exam (jangan masuk `/dashboard` dengan profil kosong)
- [x] Register sekolah: hapus pilihan Guru, atau ubah menjadi pengajuan yang disetujui admin
- [x] `AuthGuard` dan `RoleGuard`: pindahkan `router.push` ke `useEffect`
- [x] `RoleGuard`: bedakan profil belum termuat dari role tidak diizinkan
- [x] Verifikasi email setelah daftar
- [x] Ganti kata sandi dan hapus akun di pengaturan
- [x] Rate limit untuk kode ujian, kode kelas, dan token ujian kelas (login tetap dibatasi Firebase Auth)

## P3 — Notifikasi

- [x] Buat helper server untuk membuat notifikasi
- [x] Siswa: tugas baru, tugas dinilai, ujian dijadwalkan, pesan baru
- [x] Peserta exam: hasil dirilis, sertifikat disetujui atau dikirim, verifikasi akun berubah
- [x] Guru: tugas dikumpulkan, siswa bergabung ke kelas
- [x] Admin: sertifikat menunggu persetujuan, anomali ujian terdeteksi

## P4 — Fitur guru

- [x] Keluarkan siswa dari kelas
- [x] Arsipkan kelas
- [x] Ekspor nilai dan rekap ujian (CSV)
- [x] Analisis butir soal (persentase benar per soal)
- [x] Pengingat tenggat tugas
- [x] Pecah `teacher/kelas/[id]/page.tsx` (1.447 baris) dan `teacher/bank-soal/page.tsx` (1.052 baris) menjadi komponen

## P5 — Fitur siswa

- [x] Keluar dari kelas
- [x] Latihan mengikuti topik pilihan (saat ini tetap `stoikiometri`)
- [x] Pakai atau hapus data onboarding (target harian, topik)
- [x] Wajibkan atau arahkan onboarding untuk semua jalur daftar, termasuk Google
- [x] Ganti kartu topik statis di dashboard dengan data nyata
- [x] Ujian kelas: pulihkan soal dari server, bukan `sessionStorage`
- [x] Tampilkan jadwal mulai pada daftar ujian MSAT

## P6 — Admin

- [x] Hentikan paksa atau batalkan ujian per peserta
- [x] Tindak lanjut `anomalyFlags` (daftar, filter, tandai ditinjau)
- [~] Pengelolaan token dan pembayaran peserta: penyesuaian saldo admin, ledger, dan pembelian mandiri dimatikan di produksi sudah ada; integrasi pembayaran nyata belum
- [x] Lengkapi halaman `access` dan `database`
- [x] Perbarui centang di `docs/ADMIN_UI_UX_RECONSTRUCTION_TODO.md` sesuai progres sebenarnya (41 item terbukti dicentang, sisanya belum diverifikasi)

## Verifikasi setiap paket

- [ ] `npx tsc --noEmit`
- [ ] `npm run test:run`
- [ ] `npm run lint`
- [ ] Uji manual alur terkait (siswa, peserta exam, guru, admin)
