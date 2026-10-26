const usersToCreate = [
  {
    name: "Dr. Ezinwayi Madukoma",
    email: "e.madukoma@babcock.edu.ng",
    password: "password123",
    role: "hod",
    departmentCode: "irm",
  },
  {
    name: "Sola Abimbola",
    email: "s.abimbola@babcock.edu.ng",
    password: "password123",
    role: "deptTO",
    departmentCode: "acc",
  },
  {
    name: "Dr. P. Eze",
    email: "p.eze@babcock.edu.ng",
    password: "password123",
    role: "hod",
    departmentCode: "acc",
  },
  {
    name: "Emeka Nwosu",
    email: "e.nwosu@babcock.edu.ng",
    password: "password123",
    role: "deptTO",
    departmentCode: "bam",
  },
  {
    name: "Dr. C. Okeke",
    email: "c.okeke@babcock.edu.ng",
    password: "password123",
    role: "hod",
    departmentCode: "bam",
  },
  {
    name: "Ibijoke Oladele",
    email: "i.oladele@babcock.edu.ng",
    password: "password123",
    role: "deptTO",
    departmentCode: "fin",
  },
  {
    name: "Dr. F. Akintola",
    email: "f.akintola@babcock.edu.ng",
    password: "password123",
    role: "hod",
    departmentCode: "fin",
  },
];

async function main() {
  console.log("Authenticating as super_admin...");
  const loginRes = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email: "admin@babcock.edu.ng",
      password: "admin",
    }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error("Login failed:", loginData);
    process.exit(1);
  }

  const token = loginData.token;
  console.log("Authenticated successfully. Bearer token acquired.");

  const createdUsers = [];

  for (const userPayload of usersToCreate) {
    console.log(`Creating ${userPayload.role} for [${userPayload.departmentCode}] - ${userPayload.name} (${userPayload.email})...`);
    const res = await fetch("http://127.0.0.1:8000/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userPayload),
    });

    const data = await res.json();
    if (res.status === 201) {
      console.log(`✓ Created successfully: ${data.user.name} (${data.user.roleLabel})`);
      createdUsers.push(data.user);
    } else {
      console.log(`Response (${res.status}):`, data);
    }
  }

  console.log("\nAll accounts processed!");
  console.log(JSON.stringify(createdUsers, null, 2));
}

main().catch(console.error);

