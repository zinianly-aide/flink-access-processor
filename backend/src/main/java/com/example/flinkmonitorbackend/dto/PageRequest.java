package com.example.flinkmonitorbackend.dto;

import java.util.Map;

/**
 * 分页请求对象
 */
public class PageRequest {
    /**
     * 页码，从1开始
     */
    private int page = 1;
    
    /**
     * 每页记录数
     */
    private int pageSize = 10;
    
    /**
     * 搜索关键字，支持所有字段的模糊搜索
     */
    private String search;
    
    /**
     * 额外的过滤条件，key为字段名，value为过滤值
     */
    private Map<String, Object> filters;

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public String getSearch() {
        return search;
    }

    public void setSearch(String search) {
        this.search = search;
    }

    public Map<String, Object> getFilters() {
        return filters;
    }

    public void setFilters(Map<String, Object> filters) {
        this.filters = filters;
    }
}