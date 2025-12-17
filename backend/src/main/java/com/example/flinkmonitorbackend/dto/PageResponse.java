package com.example.flinkmonitorbackend.dto;

import java.util.List;

/**
 * 分页响应对象
 */
public class PageResponse<T> {
    /**
     * 总记录数
     */
    private long total;
    
    /**
     * 当前页码
     */
    private int page;
    
    /**
     * 每页记录数
     */
    private int pageSize;
    
    /**
     * 总页数
     */
    private long totalPages;
    
    /**
     * 数据列表
     */
    private List<T> data;
    
    /**
     * 是否有下一页
     */
    private boolean hasNext;
    
    /**
     * 是否有上一页
     */
    private boolean hasPrevious;
    
    public PageResponse(long total, int page, int pageSize, List<T> data) {
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = (long) Math.ceil((double) total / pageSize);
        this.data = data;
        this.hasNext = page < totalPages;
        this.hasPrevious = page > 1;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

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

    public long getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(long totalPages) {
        this.totalPages = totalPages;
    }

    public List<T> getData() {
        return data;
    }

    public void setData(List<T> data) {
        this.data = data;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public void setHasNext(boolean hasNext) {
        this.hasNext = hasNext;
    }

    public boolean isHasPrevious() {
        return hasPrevious;
    }

    public void setHasPrevious(boolean hasPrevious) {
        this.hasPrevious = hasPrevious;
    }
}