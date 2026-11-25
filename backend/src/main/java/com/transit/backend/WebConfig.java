package com.transit.backend;

import jakarta.servlet.http.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;

// RBAC: every /api/admin/** call needs a valid ADMIN token
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final JwtUtil jwt;
    public WebConfig(JwtUtil jwt) { this.jwt = jwt; }

    @Override
    public void addInterceptors(InterceptorRegistry reg) {
        reg.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object h) throws Exception {
                if ("OPTIONS".equals(req.getMethod())) return true;
                String a = req.getHeader("Authorization");
                if (a != null && a.startsWith("Bearer ") && jwt.isAdmin(a.substring(7))) return true;
                res.sendError(401, "Admin login required");
                return false;
            }
        }).addPathPatterns("/api/admin/**");
    }
}
