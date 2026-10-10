package com.dukaandaar.sdui.archetype;

public record FormArchetype(String schemaEndpoint, String submitEndpoint) implements UiArchetype {
    @Override
    public String typeCode() {
        return "FORM";
    }
}
