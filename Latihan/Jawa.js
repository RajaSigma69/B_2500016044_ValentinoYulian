let nama = "John Doe";
let umur = 25;
let statusMenikah = false;
console.log("Nama: " + nama);
console.log("Umur: " + umur);
console.log("Status Menikah: " + statusMenikah);

function hitungLuas(panjang, lebar) {
 return panjang * lebar;
}
let luas1 = hitungLuas(5, 8);
let luas2 = hitungLuas(10, 3);

let teksHasil1 = "Luas persegi panjang dengan panjang 5 dan lebar 8 adalah: " + luas1;
let teksHasil2 = "Luas persegi panjang dengan panjang 10 dan lebar 3 adalah: " + luas2;

console.log(teksHasil1);
console.log(teksHasil2);

// Menampilkan hasil perhitungan langsung ke elemen HTML
if (document.getElementById("hasil1")) {
 document.getElementById("hasil1").textContent = teksHasil1;
}
if (document.getElementById("hasil2")) {
 document.getElementById("hasil2").textContent = teksHasil2;
}

// ==========================================
// PENGATURAN TOMBOL INTERAKTIF (OUTPUT 3)
// ==========================================

// Gambar wallpaper untuk latar belakang bertema Pixel Art
// 1. Pixel Art City at Night (Latar Default)
const originalBg = "url('https://upload.wikimedia.org/wikipedia/commons/1/14/Upscaled_pixel_art_of_a_city_at_night.png') center/cover no-repeat fixed #0b0d19";
// 2. Pixel Art Retro Landscape (Latar Alternatif)
const alternateBg = "url('https://upload.wikimedia.org/wikipedia/commons/6/6a/Landscape_pixel_art.png') center/cover no-repeat fixed #1a202c";
const originalTextColor = "#222222";
const alternateTextColor = "#1a56db"; // Warna biru kontras
const originalFontSize = 16;

let isBgChanged = false;
let isTextColorChanged = false;

// 1. Tombol Ubah Latar Belakang (Berganti antara pemandangan 1 dan 2)
let btnBackground = document.createElement("button");
btnBackground.textContent = "Ubah Latar Belakang";
btnBackground.onclick = function() {
 if (!isBgChanged) {
  document.body.style.background = alternateBg;
  isBgChanged = true;
 } else {
  document.body.style.background = originalBg;
  isBgChanged = false;
 }
};

// 2. Tombol Ubah Warna Teks (Toggle: teks kontras & bisa kembali semula)
let btnTextColor = document.createElement("button");
btnTextColor.textContent = "Ubah Warna Teks";
btnTextColor.onclick = function() {
 if (!isTextColorChanged) {
  document.body.style.color = alternateTextColor;
  isTextColorChanged = true;
 } else {
  document.body.style.color = originalTextColor;
  isTextColorChanged = false;
 }
};

// 3. Tombol Perbesar Font
let btnIncreaseFont = document.createElement("button");
btnIncreaseFont.textContent = "Perbesar Font";
btnIncreaseFont.onclick = function() {
 let currentSize = parseInt(getComputedStyle(document.body).fontSize) || originalFontSize;
 document.body.style.fontSize = (currentSize + 1) + "px";
};

// 4. Tombol Perkecil Font
let btnDecreaseFont = document.createElement("button");
btnDecreaseFont.textContent = "Perkecil Font";
btnDecreaseFont.onclick = function() {
 let currentSize = parseInt(getComputedStyle(document.body).fontSize) || originalFontSize;
 if (currentSize > 10) {
  document.body.style.fontSize = (currentSize - 1) + "px";
 }
};

// Menambahkan tombol ke output3 (Reset tampilan sudah dihilangkan)
let outputDiv3 = document.getElementById("output3");
if (outputDiv3) {
 outputDiv3.appendChild(btnBackground);
 outputDiv3.appendChild(btnTextColor);
 outputDiv3.appendChild(btnIncreaseFont);
 outputDiv3.appendChild(btnDecreaseFont);
}

// ==========================================
// FORM VALIDASI (OUTPUT 4)
// ==========================================

// Membuat form
let form = document.createElement("form");

// Input nama
let labelNama = document.createElement("label");
labelNama.textContent = "Nama: ";
let inputNama = document.createElement("input");
inputNama.type = "text";
inputNama.id = "nama";

// Input email
let labelEmail = document.createElement("label");
labelEmail.textContent = "Email: ";
let inputEmail = document.createElement("input");
inputEmail.type = "email";
inputEmail.id = "email";

// Tombol submit
let btnSubmit = document.createElement("button");
btnSubmit.type = "button";
btnSubmit.textContent = "Submit";

// Area pesan error
let errorDiv = document.createElement("div");
errorDiv.id = "error-message";
errorDiv.style.color = "red";

// Menambahkan event listener
btnSubmit.onclick = function() {
  let nama = inputNama.value;
  let email = inputEmail.value;
  let errorMessage = "";

  if (nama === "") {
    errorMessage += "Nama tidak boleh kosong.";
  }

  if (email.indexOf("@") === -1) {
    errorMessage += "Email harus mengandung @.";
  }

  if (errorMessage !== "") {
    errorDiv.textContent = errorMessage;
    errorDiv.style.color = "red";
  } else {
    errorDiv.textContent = "Form valid! Data berhasil dikirim.";
    errorDiv.style.color = "green";
  }
};

// Menambahkan elemen ke form
form.appendChild(labelNama);
form.appendChild(inputNama);
form.appendChild(document.createElement("br"));
form.appendChild(labelEmail);
form.appendChild(inputEmail);
form.appendChild(document.createElement("br"));
form.appendChild(btnSubmit);
form.appendChild(errorDiv);

// Menambahkan form ke output
let outputDiv4 = document.getElementById("output4");
if (outputDiv4) {
  outputDiv4.appendChild(form);
}

// ==========================================
// TO-DO LIST DENGAN LOCALSTORAGE (OUTPUT 5)
// ==========================================

// Membuat elemen input dan tombol
let inputTask = document.createElement("input");
inputTask.type = "text";
inputTask.placeholder = "Masukkan tugas baru...";
inputTask.id = "task-input";

let btnAdd = document.createElement("button");
btnAdd.textContent = "Tambah";
btnAdd.id = "add-task";

let taskList = document.createElement("ul");
taskList.id = "task-list";

// Menambahkan event listener
btnAdd.onclick = function() {
  let taskText = inputTask.value.trim();
  if (taskText !== "") {
    addTask(taskText);
    inputTask.value = "";
    saveTasks();
  }
};

// Fungsi untuk menambahkan tugas
function addTask(taskText) {
  let li = document.createElement("li");

  let checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("change", function() {
    if (this.checked) {
      taskSpan.style.textDecoration = "line-through";
    } else {
      taskSpan.style.textDecoration = "none";
    }
    saveTasks();
  });

  let taskSpan = document.createElement("span");
  taskSpan.textContent = taskText;

  let deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Hapus";
  deleteBtn.addEventListener("click", function() {
    li.remove();
    saveTasks();
  });

  li.appendChild(checkbox);
  li.appendChild(taskSpan);
  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

// Fungsi untuk menyimpan tugas ke localStorage
function saveTasks() {
  let tasks = [];
  document.querySelectorAll("#task-list li").forEach(function(li) {
    let taskText = li.querySelector("span").textContent;
    let isCompleted = li.querySelector("input[type='checkbox']").checked;
    tasks.push({ text: taskText, completed: isCompleted });
  });
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Fungsi untuk memuat tugas dari localStorage
function loadTasks() {
  let savedTasks = localStorage.getItem("tasks");
  if (savedTasks) {
    let tasks = JSON.parse(savedTasks);
    tasks.forEach(function(task) {
      addTask(task.text);
      let lastAdded = taskList.lastChild;
      let checkbox = lastAdded.querySelector("input[type='checkbox']");
      checkbox.checked = task.completed;
      if (task.completed) {
        lastAdded.querySelector("span").style.textDecoration = "line-through";
      }
    });
  }
}

// Menambahkan elemen ke output
let outputDiv5 = document.getElementById("output5");
if (outputDiv5) {
  outputDiv5.appendChild(inputTask);
  outputDiv5.appendChild(btnAdd);
  outputDiv5.appendChild(taskList);
}

// Memuat tugas yang disimpan
loadTasks();
