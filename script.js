/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   ตรวจจับหน้าจาก id ของ element แล้วทำงานเฉพาะส่วนที่เกี่ยวข้อง
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

(function () {
  "use strict";

  /* ---------- ค่าคงที่ ---------- */
  var PRODUCTS_URL = "products.json";
  var ORDER_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzg1wBVaBy5vitFor-8LM9b9STwopCMZXT8D5YkOnG_hqG2D106Fsendy0GSqWzB33g_w/exec";
  var ORDERS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfB7Y2Wf11GwyP4Dwuewi2PyNk9Vs5JkFyNXuRVwDN_ED8WDxNOr8W4iFM-DWR1_TkKFzLaSEhN9hx/pub?gid=0&single=true&output=csv";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  var TYPE_LABELS = { spray: "น้ำหอมฉีดตัว", rollon: "โรลออน" };

  /* ---------- Helpers ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function moodLabel(key) {
    for (var i = 0; i < MOODS.length; i++) {
      if (MOODS[i].key === key) return MOODS[i].label;
    }
    return key;
  }

  function formatNumber(value) {
    var n = Number(value);
    return isFinite(n) && String(value).trim() !== "" ? n.toLocaleString("th-TH") : value;
  }

  /* ==========================================================
     1) หน้า product.html
     ========================================================== */
  function initProductPage() {
    var filterBar = document.getElementById("filter-bar");
    var list = document.getElementById("product-list");
    if (!filterBar || !list) return;

    var products = [];
    var validMoods = MOODS.map(function (m) { return m.key; });

    function getInitialMood() {
      var m = (new URLSearchParams(window.location.search).get("mood") || "").toLowerCase();
      return validMoods.indexOf(m) !== -1 ? m : "all";
    }

    function buildFilterBar(activeMood) {
      filterBar.textContent = "";
      MOODS.forEach(function (m) {
        var btn = el("button", "filter-btn", m.label);
        btn.type = "button";
        btn.dataset.mood = m.key;
        var active = m.key === activeMood;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        filterBar.appendChild(btn);
      });
    }

    function buildOrderUrl(p) {
      var itemName = p.name + (p.size ? " " + p.size : "");
      return (
        "order.html?item=" + encodeURIComponent(itemName) +
        "&price=" + encodeURIComponent(p.price)
      );
    }

    function buildCard(p) {
      var card = el("article", "product-card");
      card.dataset.mood = p.mood;

      var imgWrap = el("div", "product-card__image");
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      imgWrap.appendChild(img);

      var body = el("div", "product-card__body");
      body.appendChild(el("span", "mood-tag", moodLabel(p.mood)));
      body.appendChild(el("h3", "product-card__title", p.name));
      body.appendChild(
        el("p", "product-card__meta", p.size || TYPE_LABELS[p.type] || "")
      );

      var footer = el("div", "product-card__footer");
      var price = el("span", "price", formatNumber(p.price) + " ");
      price.appendChild(el("small", null, "บาท"));
      var buy = el("a", "btn btn--small", "สั่งซื้อ");
      buy.href = buildOrderUrl(p);
      footer.appendChild(price);
      footer.appendChild(buy);

      body.appendChild(footer);
      card.appendChild(imgWrap);
      card.appendChild(body);
      return card;
    }

    function render(mood) {
      list.textContent = "";
      var items = products.filter(function (p) {
        return mood === "all" || p.mood === mood;
      });
      if (!items.length) {
        list.appendChild(el("p", "text-center", "ไม่พบสินค้าในหมวดนี้"));
        return;
      }
      items.forEach(function (p) { list.appendChild(buildCard(p)); });
    }

    function setMood(mood) {
      Array.prototype.forEach.call(filterBar.querySelectorAll(".filter-btn"), function (b) {
        var active = b.dataset.mood === mood;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      render(mood);
      // อัปเดต URL ให้แชร์ลิงก์ที่กรองแล้วได้ (ไม่เพิ่มประวัติเบราว์เซอร์)
      if (window.history && history.replaceState) {
        var url = new URL(window.location.href);
        if (mood === "all") url.searchParams.delete("mood");
        else url.searchParams.set("mood", mood);
        history.replaceState(null, "", url);
      }
    }

    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (btn) setMood(btn.dataset.mood);
    });

    var initialMood = getInitialMood();
    buildFilterBar(initialMood);
    list.appendChild(el("p", "text-center", "กำลังโหลดสินค้า..."));

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        render(initialMood);
      })
      .catch(function (err) {
        console.error(err);
        list.textContent = "";
        list.appendChild(
          el("p", "text-center", "ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง")
        );
      });
  }

  /* ==========================================================
     2) หน้า order.html
     ========================================================== */
  function initOrderPage() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var itemsInput = document.getElementById("items");
    var totalInput = document.getElementById("total");

    // เติมค่าจาก URL parameter อัตโนมัติ (ทั้ง items และ total)
    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var price = params.get("price");
    if (itemsInput && item !== null) itemsInput.value = item;
    if (totalInput && price !== null) totalInput.value = price;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var payload = {
        customerName: document.getElementById("customerName").value.trim(),
        contact: document.getElementById("contact").value.trim(),
        items: itemsInput.value.trim(),
        total: totalInput.value.trim(),
        note: document.getElementById("note").value.trim()
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true; // กันกดซ้ำ

      fetch(ORDER_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload)
      })
        .then(function () {
          window.location.href = "thankyou.html";
        })
        .catch(function (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ==========================================================
     3) หน้า admin.html
     ========================================================== */

  // parse CSV เอง: รองรับ "..." ครอบ field, "" แทน " ในข้อความ,
  // ขึ้นบรรทัดใหม่ใน field, และ \r\n
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
    // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
    if (field !== "" || row.length) { row.push(field); rows.push(row); }

    // ตัดแถวว่าง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ""; });
    });
  }

  function initAdminPage() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;

    var COLS = 6;

    function message(text) {
      tbody.textContent = "";
      var tr = document.createElement("tr");
      var td = el("td", "text-center", text);
      td.colSpan = COLS;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    message("กำลังโหลดข้อมูล...");

    // เติม timestamp กัน cache ของ Google (ข้อมูลที่เผยแพร่จะ cache ระยะสั้นอยู่แล้ว)
    var url = ORDERS_CSV_URL + "&t=" + Date.now();

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);
        rows.shift(); // ตัดแถวหัวตาราง

        if (!rows.length) {
          message("ยังไม่มีรายการสั่งซื้อ");
          return;
        }

        // ชีตเพิ่มแถวใหม่ต่อท้ายเสมอ → กลับลำดับให้ล่าสุดขึ้นก่อน
        rows.reverse();

        tbody.textContent = "";
        rows.forEach(function (r) {
          var tr = document.createElement("tr");
          for (var i = 0; i < COLS; i++) {
            var value = r[i] !== undefined ? r[i] : "";
            if (i === 4) value = formatNumber(value); // จำนวนเงินรวม
            var td = document.createElement("td");
            td.textContent = value; // textContent กัน HTML injection จากข้อมูลลูกค้า
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        console.error(err);
        message("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      });
  }

  /* ---------- Start ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
