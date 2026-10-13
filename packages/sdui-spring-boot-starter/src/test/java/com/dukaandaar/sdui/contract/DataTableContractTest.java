package com.dukaandaar.sdui.contract;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Guards the wire format against accidental drift. rn-backend and all projects depend
 * on these exact JSON keys, so a rename here would break every consumer silently.
 */
class DataTableContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @SuppressWarnings("unchecked")
    private Map<String, Object> json(Object value) throws Exception {
        return mapper.readValue(mapper.writeValueAsString(value), Map.class);
    }

    @Test
    void responseSerializesCanonicalKeys() throws Exception {
        ColumnDefinition column = new ColumnDefinition("id", "ID", "text", true, false, "left", null, null,
                Map.of(), List.of());
        DataTableResponse<String> response = new DataTableResponse<>(
                List.of("a"), 1, 1, 0, 10, true,
                List.of(column), List.of(), null, null, Map.of(), null, null, null, null);

        Map<String, Object> json = json(response);

        assertTrue(json.containsKey("content"));
        assertTrue(json.containsKey("totalElements"));
        assertTrue(json.containsKey("totalPages"));
        assertTrue(json.containsKey("pageNumber"));
        assertTrue(json.containsKey("pageSize"));
        assertTrue(json.containsKey("last"));
        assertFalse(json.containsKey("isLast"), "wire field must be 'last', not 'isLast'");
        assertTrue(json.containsKey("columns"));
        assertTrue(json.containsKey("filters"));
        assertTrue(json.containsKey("enableLiveReload"));
        assertTrue(json.containsKey("defaultLiveReload"));
        assertTrue(json.containsKey("enableExport"));
        assertTrue(json.containsKey("enableColumnVisibility"));
    }

    @Test
    void nullFeatureFlagsFallBackToDefaults() {
        DataTableResponse<String> response = new DataTableResponse<>(
                null, 0, 0, 0, 10, true, null, null, null, null, null, null, null, null, null);

        assertEquals(Boolean.TRUE, response.enableLiveReload());
        assertEquals(0, response.defaultLiveReload());
        assertTrue(response.enableExport());
        assertTrue(response.enableColumnVisibility());
        assertTrue(response.content().isEmpty());
        assertTrue(response.columns().isEmpty());
        assertTrue(response.filters().isEmpty());
        assertTrue(response.summary().isEmpty());
    }

    @Test
    void requestClampsPagingAndNormalisesSortDir() {
        DataTableRequest request = new DataTableRequest(-3, 500, "createdAt", "asc",
                "  tea ", Map.of("status", "ACTIVE"));

        assertEquals(0, request.page());
        assertEquals(10, request.size());
        assertEquals("ASC", request.sortDir());
        assertEquals("tea", request.filterString("status") == null ? null : request.search().trim());
    }

    @Test
    void stagesSerializesInResponse() throws Exception {
        StageDefinition stage = new StageDefinition("PACKED", "Packed", "orange", null, null, List.of("PACKED", "PREPARING"));
        DataTableResponse<String> response = new DataTableResponse<>(
                List.of("order-1"), 1, 1, 0, 10, true,
                List.of(), List.of(), null, null, Map.of(),
                List.of(stage),
                true, 0, true, true);

        Map<String, Object> json = json(response);
        assertTrue(json.containsKey("stages"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> stages = (List<Map<String, Object>>) json.get("stages");
        assertEquals(1, stages.size());
        assertEquals("PACKED", stages.get(0).get("key"));
        assertEquals("orange", stages.get(0).get("color"));
    }
}
