package com.dukaandaar.sdui.contract;

import java.util.List;

/**
 * Universal stage contract for Kanban, workflow, and lifecycle views.
 * Pure data carrier: zero third-party framework dependencies.
 *
 * Matches the frontend {@code KanbanStageDef} wire contract.
 */
public record StageDefinition(
        String key,
        String label,
        String color,
        String textColor,
        String borderColor,
        List<String> statuses
) {
    public StageDefinition {
        statuses = statuses != null ? List.copyOf(statuses) : (key != null ? List.of(key) : List.of());
    }

    public StageDefinition(String key, String label, String color) {
        this(key, label, color, null, null, key != null ? List.of(key) : List.of());
    }
}
