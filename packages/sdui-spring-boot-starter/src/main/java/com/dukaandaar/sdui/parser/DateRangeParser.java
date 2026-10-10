package com.dukaandaar.sdui.parser;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/**
 * Lenient date parsing for table filter parameters. Accepts whichever shape the
 * client's picker produces; an unparseable value becomes "no bound" rather than a 500.
 */
public final class DateRangeParser {

    private DateRangeParser() {
    }

    /** @return the parsed value, or null when absent/unparseable. */
    public static LocalDateTime parse(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            return java.time.LocalDateTime.parse(trimmed);
        } catch (java.time.format.DateTimeParseException ignored) {
            // fall through
        }
        try {
            return java.time.LocalDate.parse(trimmed).atStartOfDay();
        } catch (java.time.format.DateTimeParseException ignored) {
            // fall through
        }
        try {
            return java.time.OffsetDateTime.parse(trimmed).toLocalDateTime();
        } catch (java.time.format.DateTimeParseException ignored) {
            // fall through
        }
        try {
            return java.time.Instant.parse(trimmed).atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    /** Date-only value as end-of-day, so a range ending today includes today's rows. */
    public static java.time.LocalDateTime parseEndOfDay(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            return java.time.LocalDate.parse(trimmed).atTime(23, 59, 59);
        } catch (DateTimeParseException ignored) {
            return parse(trimmed);
        }
    }

    /** Start-of-day for a date-only value. */
    public static java.time.LocalDateTime parseStartOfDay(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        try {
            return java.time.LocalDate.parse(trimmed).atStartOfDay();
        } catch (DateTimeParseException ignored) {
            return parse(trimmed);
        }
    }
}
