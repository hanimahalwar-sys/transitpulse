package com.transit.backend;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.regex.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Minimal HS256 JWT (no extra library needed)
@Component
public class JwtUtil {
    @Value("${jwt.secret}") private String secret;

    private static String b64(byte[] b) { return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }

    private String sign(String data) {
        try {
            Mac m = Mac.getInstance("HmacSHA256");
            m.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return b64(m.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    public String create(String sub, String role) {
        String h = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        long exp = System.currentTimeMillis() / 1000 + 3600; // 1 hour
        String p = b64(("{\"sub\":\"" + sub + "\",\"role\":\"" + role + "\",\"exp\":" + exp + "}").getBytes(StandardCharsets.UTF_8));
        return h + "." + p + "." + sign(h + "." + p);
    }

    public boolean isAdmin(String token) {
        try {
            String[] t = token.split("\\.");
            if (t.length != 3) return false;
            if (!MessageDigest.isEqual(sign(t[0] + "." + t[1]).getBytes(), t[2].getBytes())) return false;
            String json = new String(Base64.getUrlDecoder().decode(t[1]), StandardCharsets.UTF_8);
            Matcher e = Pattern.compile("\"exp\":(\\d+)").matcher(json);
            return e.find() && Long.parseLong(e.group(1)) > System.currentTimeMillis() / 1000 && json.contains("\"role\":\"ADMIN\"");
        } catch (Exception e) { return false; }
    }
}
