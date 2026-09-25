async function check() {
    try {
        console.log("Pinging inho-api...");
        let r1 = await fetch("https://inho-api.orbesystems.com.br/health");
        console.log("inho-api status:", r1.status);
    } catch (e) {
        console.error("inho-api error:", e.message);
    }

    try {
        console.log("Pinging api.orbesystems.com.br...");
        let r2 = await fetch("https://api.orbesystems.com.br/health");
        console.log("orbe-api status:", r2.status);
    } catch (e) {
        console.error("orbe-api error:", e.message);
    }
}
check();
