package com.dukaandaar.sdui.archetype;

public record TableArchetype(String entityName, String dataEndpoint) implements UiArchetype {
    @Override
    public String typeCode() {
        return "TABLE";
    }
}
