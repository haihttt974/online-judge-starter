# Online Judge Starter

Phan mem cham bai lap trinh bang testcase, chay noi bo bang Docker.

## Chuc nang

- Chon ngon ngu: C, C++, Python, Java, C#, Pascal.
- Dan code vao o nhap code.
- Upload testcase dang `1.IN`, `1.OUT`, `2.IN`, `2.OUT`, ...
- Them testcase truc tiep tren web bang modal nhap input va output dung; he thong tu dat so thu tu tiep theo.
- Hien danh sach testcase hop le o phan ket qua ngay sau khi upload, trang thai ban dau la chua chay.
- Bang ket qua co cot input, output thuc te va output dung; testcase `AC` an noi dung bang dau `-`, cac trang thai khac hien noi dung de doi chieu.
- Goc phai phan ket qua hien tat ca trang thai dang co trong bo testcase, kem ten day du va so luong.
- Co Mini Toast Notification System de thong bao upload testcase, them testcase, bat dau cham, ket qua cham va loi.
- Hien tac gia Le Duy Hai tren trang Online Judge Starter.
- Co nut mo modal thong tin lien he day du: Facebook, Zalo, TikTok, Discord, Instagram, LinkedIn, Kaggle, Email.
- Bien dich/chay toan bo testcase.
- Hien thi trang thai: `AC`, `WA`, `PE`, `TLE`, `MLE`, `OLE`, `ER`, `CE`, `NTD`, `SE`.
- Tinh diem theo so testcase dung.
- Thoi gian/testcase va bo nho duoc co dinh theo ngon ngu lap trinh.
- Ho tro hot reload khi sua code trong project.

## Cach chay

Chi can cai Docker Desktop, sau do chay:

```bash
docker compose up --build
```

Mo trinh duyet:

- Che do phat trien (Docker Compose): `http://localhost:8080`
- Che do build san (Production): `http://localhost:3000`

Sau lan build/chay dau tien, khi sua code:

- Sua frontend trong `client/src/*`: trinh duyet tu cap nhat qua Vite HMR.
- Sua backend trong `server/src/*`: backend tu restart bang `nodemon`.
- Khong can build lai image hoac chay lai container cho thay doi code thong thuong.

Chi can build/chay lai khi:

- Sua `Dockerfile`.
- Sua `docker-compose.yml`.
- Them/xoa dependency trong `package.json`.
- Container bi dung hoac loi can khoi dong lai.

## Kien truc dev hien tai

Trong Docker:

- Vite dev server chay o port `8080`.
- Express backend chay o port `3000`.
- Vite proxy cac request `/api/*` sang `http://127.0.0.1:3000`.
- Source code `client/` va `server/` duoc mount vao container bang Docker volume.

## Gioi han theo ngon ngu

Nguoi dung khong duoc tu chon thoi gian/testcase va bo nho. Frontend chi hien thi gia tri co dinh, backend tu ep limit theo `language`.

| Ngon ngu | Thoi gian/testcase | Bo nho |
| --- | ---: | ---: |
| C | 2000 ms | 256 MB |
| C++ | 1000 ms | 128 MB |
| Pascal | 2000 ms | 256 MB |
| Java | 3000 ms | 512 MB |
| C# | 3000 ms | 512 MB |
| Python | 5000 ms | 512 MB |

## Sua thong tin tac gia va contact

Tat ca thong tin tac gia nam trong:

```text
client/src/profileData.js
```

Sua file nay de cap nhat ten tac gia, email va link Facebook, Zalo, TikTok, Discord, Instagram, LinkedIn, Kaggle.

## Cau truc thu muc

```text
online-judge-starter/
├── Agent.md
├── Dockerfile
├── docker-compose.yml
├── README.md
├── agent-images/
│   └── README.md
├── server/
│   ├── package.json
│   └── src/
│       ├── server.js
│       └── judge.js
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── profileData.js
        ├── main.jsx
        ├── App.jsx
        └── style.css
```

## Quy tac dat ten testcase

Dat file theo cap:

```text
1.IN
1.OUT
2.IN
2.OUT
3.IN
3.OUT
```

Ten file co the viet thuong hoac viet hoa, vi du `1.in`, `1.out` van duoc.

## Luu y bao mat

Ban starter nay phu hop de chay noi bo, demo, hoc tap hoac dung trong phong may tin cay.

Neu muon mo cho nguoi la nop bai tren Internet, can nang cap sang mo hinh sandbox rieng cho tung lan chay, gioi han network, CPU, RAM va quyen ghi file.
