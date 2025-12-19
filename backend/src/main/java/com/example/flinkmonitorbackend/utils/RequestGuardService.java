package com.example.flinkmonitorbackend.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RequestGuardService {

    private static final Logger log = LoggerFactory.getLogger(RequestGuardService.class);

    private static final int MAX_REQUESTS_PER_WINDOW = 30;
    private static final long WINDOW_MS = 10_000L;
    private static final long CACHE_TTL_MS = 60_000L;

    private final ConcurrentHashMap<String, RequestWindow> requestWindows = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CachedResponse> idempotentCache = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key) {
        RequestWindow window = requestWindows.computeIfAbsent(key, k -> new RequestWindow());
        boolean allowed = window.tryAcquire(MAX_REQUESTS_PER_WINDOW, WINDOW_MS);
        if (!allowed) {
            log.warn("触发速率限制，clientKey={} 当前窗口请求数={}", key, window.getCount());
        }
        return allowed;
    }

    public Optional<Map<String, Object>> getCachedResponse(String cacheKey) {
        CachedResponse cached = idempotentCache.get(cacheKey);
        if (cached == null) {
            return Optional.empty();
        }

        if (System.currentTimeMillis() - cached.timestamp > CACHE_TTL_MS) {
            idempotentCache.remove(cacheKey);
            return Optional.empty();
        }

        return Optional.of(cached.body);
    }

    public void cacheResponse(String cacheKey, Map<String, Object> responseBody) {
        idempotentCache.put(cacheKey, new CachedResponse(responseBody, System.currentTimeMillis()));
    }

    public String buildCacheKey(String clientKey, String operation, String payload) {
        String seed = clientKey + ":" + operation + ":" + payload;
        return digest(seed);
    }

    private String digest(String seed) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(seed.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("无法初始化摘要算法", e);
        }
    }

    private static class RequestWindow {
        private final AtomicInteger counter = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        boolean tryAcquire(int limit, long windowMs) {
            synchronized (this) {
                long now = System.currentTimeMillis();
                if (now - windowStart > windowMs) {
                    windowStart = now;
                    counter.set(0);
                }

                counter.incrementAndGet();
                return counter.get() <= limit;
            }
        }

        int getCount() {
            return counter.get();
        }
    }

    private record CachedResponse(Map<String, Object> body, long timestamp) {
    }
}
