'use strict';

export var auto_completes = {};
export function set_auto_completes(new_data) {
    auto_completes = new_data;
}

export var citations = [];
export function set_citations(new_data) {
    citations = new_data;
}

export var label_keys = [];
export function set_label_keys(new_keys) {
    label_keys = new_keys;
}

export var main_document;
export function set_main_document(document) {
    main_document = document;
}