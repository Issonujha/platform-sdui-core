package com.dukaandaar.sdui.contract;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/**
 * Fluent builder for {@link DataTableResponse}. Two usage styles:
 *
 * <ul>
 *   <li>instance: {@code DataTableBuilder.<Dto>create().addColumn(...)...page(page, mapper)}</li>
 *   <li>static: {@link #fromPage(Page, Function, List, List)} for one-shot use.</li>
 * </ul>
 */
public final class DataTableBuilder<T> {

    private final List<ColumnDefinition> columns = new ArrayList<>();
    private final List<FilterDefinition> filters = new ArrayList<>();
    private final List<StageDefinition> stages = new ArrayList<>();
    private String defaultSortBy = "createdAt";
    private String defaultSortDir = "DESC";
    private Map<String, Object> summary;
    private Boolean enableLiveReload = Boolean.TRUE;
    private Integer defaultLiveReload = 0;
    private Boolean enableExport = Boolean.TRUE;
    private Boolean enableColumnVisibility = Boolean.TRUE;

    private DataTableBuilder() {
    }

    public static <T> DataTableBuilder<T> create() {
        return new DataTableBuilder<>();
    }

    public static <S, R> DataTableResponse<R> fromPage(
            org.springframework.data.domain.Page<S> page,
            java.util.function.Function<S, R> mapper,
            List<ColumnDefinition> columns,
            List<FilterDefinition> filters) {
        return new DataTableResponse<>(
                page.map(mapper).getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize(),
                page.isLast(),
                columns,
                filters,
                null,
                null,
                Map.of(),
                Boolean.TRUE,
                0,
                Boolean.TRUE,
                Boolean.TRUE);
    }

    public DataTableBuilder<T> addColumn(ColumnDefinition column) {
        if (column != null) {
            columns.add(column);
        }
        return this;
    }

    public DataTableBuilder<T> addColumn(String key, String label, String type) {
        return addColumn(new ColumnDefinition(key, label, type, true, false, "left", null, null, Map.of(), List.of()));
    }

    public DataTableBuilder<T> addColumn(String key, String label, String type, boolean sortable) {
        return addColumn(new ColumnDefinition(key, label, type, sortable, false, "left", null, null, Map.of(), List.of()));
    }

    public DataTableBuilder<T> addFilter(FilterDefinition filter) {
        if (filter != null) {
            filters.add(filter);
        }
        return this;
    }

    public DataTableBuilder<T> defaultSort(String by, String dir) {
        this.defaultSortBy = by;
        this.defaultSortDir = dir;
        return this;
    }

    public DataTableBuilder<T> summary(Map<String, Object> summary) {
        this.summary = summary;
        return this;
    }

    public DataTableBuilder<T> liveReload(boolean enabled, int interval) {
        this.enableLiveReload = enabled;
        this.defaultLiveReload = interval;
        return this;
    }

    public DataTableBuilder<T> enableExport(boolean enabled) {
        this.enableExport = enabled;
        return this;
    }

    public DataTableBuilder<T> enableColumnVisibility(boolean enabled) {
        this.enableColumnVisibility = enabled;
        return this;
    }

    public DataTableBuilder<T> addStage(StageDefinition stage) {
        if (stage != null) {
            stages.add(stage);
        }
        return this;
    }

    public DataTableBuilder<T> addStage(String key, String label, String color) {
        return addStage(new StageDefinition(key, label, color));
    }

    public DataTableBuilder<T> stages(List<StageDefinition> stages) {
        this.stages.clear();
        if (stages != null) {
            this.stages.addAll(stages);
        }
        return this;
    }

    /** Terminal for the fluent path: maps the page and attaches the accumulated schema. */
    public <S> DataTableResponse<T> page(Page<S> page, java.util.function.Function<S, T> mapper) {
        DataTableResponse<T> base = fromPage(page, mapper, List.copyOf(columns), List.copyOf(filters));
        return new DataTableResponse<>(
                base.content(),
                base.totalElements(),
                base.totalPages(),
                base.pageNumber(),
                base.pageSize(),
                base.last(),
                base.columns(),
                base.filters(),
                defaultSortBy,
                defaultSortDir,
                summary,
                List.copyOf(stages),
                enableLiveReload,
                defaultLiveReload,
                enableExport,
                enableColumnVisibility);
    }
}
