package com.dukaandaar.sdui.archetype;

public record KanbanArchetype(String entityName, String stagesEndpoint) implements UiArchetype {
    @Override
    public String typeCode() {
        return "KANBAN";
    }
}
