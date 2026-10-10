package com.dukaandaar.sdui.archetype;

public record SubtabContainerArchetype(String defaultSubtabKey) implements UiArchetype {
    @Override
    public String typeCode() {
        return "SUBTAB_CONTAINER";
    }
}
