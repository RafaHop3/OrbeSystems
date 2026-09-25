async function testLogin() {
    try {
        console.log("Testing POST /api/auth/login...");
        let resp = await fetch("https://api.orbesystems.com.br/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "rafael@orbesystems.com.br",
                password: "Muhammadalivsroyjonesjr#Ju.130798"
            })
        });

        console.log("Status:", resp.status);
        let text = await resp.text();
        console.log("Response:", text);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

testLogin();
