/* global Vue, ELEMENT, moment */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins,
        availableDateFormats = ['MMDDYYYY', 'MM-DD-YYYY', 'MM/DD/YYYY', 'MMDDYY', 'MM-DD-YY', 'MM/DD/YYYY'];

    /**
     * Attempts to parse the provided string using one of the available date formats.
     * @param {String} rawString String value to be parsed
     * @returns {Object} Moment object 
     */
    function tryParsingDate(rawString) {
        return moment(rawString, availableDateFormats, true);
    }

    Vue.component("cly-daterangepicker", countlyBaseComponent.extend({
        mixins: [_mixins.i18n],
        components: {
            'date-table': ELEMENT.DateTable
        },
        template: '<div class="cly-vue-daterp" :class="{\'cly-vue-daterp--custom-selection\': !selectedShortcut}">\
                    <div class="cly-vue-daterp__shortcuts-col">\
                        <div class="text-medium font-weight-bold cly-vue-daterp__shortcut cly-vue-daterp__shortcut--custom"\
                            @click="handleShortcutClick()">\
                            Custom Range<i class="el-icon-caret-right"></i>\
                        </div>\
                        <div class="text-medium font-weight-bold cly-vue-daterp__shortcut"\
                            :class="{\'cly-vue-daterp__shortcut--active\': selectedShortcut == shortcut.value}"\
                            v-for="shortcut in shortcuts"\
                            @click="handleShortcutClick(shortcut.value)">\
                            {{shortcut.label}}\
                        </div>\
                    </div>\
                    <div class="cly-vue-daterp__calendars-col" v-if="!selectedShortcut">\
                        <pre>{{ inBetweenInput }}</pre>\
                        <pre>{{ sinceInput }}</pre>\
                        <pre>{{ inTheLastInput }}</pre>\
                        <div class="cly-vue-daterp__input-methods">\
                            <el-tabs v-model="rangeMode" @change="handleUserInputUpdate">\
                                <el-tab-pane name="inBetween">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In Between</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model="inBetweenInput.raw.textStart"></el-input>\
                                        <span class="text-medium">and</span>\
                                        <el-input size="small" v-model="inBetweenInput.raw.textEnd"></el-input>\
                                    </div>\
                                </el-tab-pane>\
                                <el-tab-pane name="since">\
                                    <template slot="label"><span class="text-medium font-weight-bold">Since</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model="sinceInput.raw.text"></el-input>\
                                    </div>\
                                </el-tab-pane>\
                                <el-tab-pane name="inTheLast">\
                                    <template slot="label"><span class="text-medium font-weight-bold">In the Last</span></template>\
                                    <div class="cly-vue-daterp__input-wrapper">\
                                        <el-input size="small" v-model.number="inTheLastInput.raw.text"></el-input>\
                                        <el-select size="small" v-model="inTheLastInput.raw.level">\
                                            <el-option label="Days" value="days"></el-option>\
                                            <el-option label="Weeks" value="weeks"></el-option>\
                                            <el-option label="Months" value="months"></el-option>\
                                        </el-select>\
                                    </div>\
                                </el-tab-pane>\
                            </el-tabs>\
                            <div class="cly-vue-daterp__day-names-wrapper">\
                                <table class="cly-vue-daterp__day-names"><tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></table>\
                            </div>\
                        </div>\
                        <div class="cly-vue-daterp__calendars-wrapper">\
                            <el-scrollbar\
                                wrap-class="cly-vue-daterp__table-wrap"\
                                view-class="cly-vue-daterp__table-view">\
                                <div class="cly-vue-daterp__table-wrap" style="height: 248px">\
                                    <div class="cly-vue-daterp__table-view">\
                                        <div style="height:12px"></div>\
                                        <div class="cly-vue-daterp__date-table-wrapper" :key="item.key" v-for="item in globalRange">\
                                            <span class="text-medium">{{ item.title }}</span>\
                                            <date-table \
                                                selection-mode="range"\
                                                :date="item.date"\
                                                :min-date="minDate"\
                                                :max-date="maxDate"\
                                                :range-state="rangeState"\
                                                @pick="handleRangePick"\
                                                @changerange="handleChangeRange">\
                                            </date-table>\
                                        </div>\
                                        <div style="height:1px"></div>\
                                    </div>\
                                </div>\
                            </el-scrollbar>\
                        </div>\
                        <div class="cly-vue-daterp__commit-section">\
                            <el-button @click="doDiscard" size="small">{{ i18n("common.cancel") }}</el-button>\
                            <el-button @click="doCommit" type="primary" size="small">{{ i18n("common.confirm") }}</el-button>\
                        </div>\
                    </div>\
                </div>',
        data: function() {
            var maxYearsBack = 1,
                globalRange = [],
                globalMin = moment().subtract(maxYearsBack, 'y').startOf("M"),
                globalMax = moment(),
                cursor = moment(globalMin.toDate()),
                now = moment().toDate();

            while (cursor < globalMax) {
                cursor = cursor.add(1, "M");
                globalRange.push({
                    date: cursor.toDate(),
                    title: cursor.format("MMMM, YYYY"),
                    key: cursor.unix()
                });
            }
            return {
                // Calendar state

                minDate: moment().subtract(1, 'M').startOf("M").toDate(),
                maxDate: globalMax.toDate(),

                rangeState: {
                    endDate: null,
                    selecting: false,
                    row: null,
                    column: null
                },

                // Time constants

                now: now,
                globalRange: globalRange,

                // Shortcuts

                selectedShortcut: null,
                shortcuts: [
                    {label: this.i18n("common.yesterday"), value: "yesterday"},
                    {label: this.i18n("common.today"), value: "hour"},
                    {label: this.i18n("taskmanager.last-7days"), value: "7days"},
                    {label: this.i18n("taskmanager.last-30days"), value: "30days"},
                    {label: this.i18n("taskmanager.last-60days"), value: "60days"},
                    {label: moment().format("MMMM, YYYY"), value: "day"},
                    {label: moment().year(), value: "month"},
                ],

                // User input

                rangeMode: 'inBetween',
                inBetweenInput: {
                    raw: {
                        textStart: '',
                        textEnd: ''
                    },
                    parsed: [null, null]
                },
                sinceInput: {
                    raw: {
                        text: '',
                    },
                    parsed: [null, now]
                },
                inTheLastInput: {
                    raw: {
                        text: '',
                        level: 'days'
                    },
                    parsed: [null, now]
                },
            };
        },
        watch: {
            'inBetweenInput.raw.textStart': function(newVal) {
                var parsed = tryParsingDate(newVal);
                if (parsed && parsed.isValid()) {
                    this.inBetweenInput.parsed[0] = parsed.toDate();
                    this.handleUserInputUpdate();
                }
            },
            'inBetweenInput.raw.textEnd': function(newVal) {
                var parsed = tryParsingDate(newVal);
                if (parsed && parsed.isValid()) {
                    this.inBetweenInput.parsed[1] = parsed.toDate();
                    this.handleUserInputUpdate();
                }
            },
            'sinceInput.raw.text': function(newVal) {
                var parsed = tryParsingDate(newVal);
                if (parsed && parsed.isValid()) {
                    this.sinceInput.parsed[0] = parsed.toDate();
                    this.handleUserInputUpdate();
                }
            },
            'inTheLastInput.raw': {
                deep: true,
                handler: function(newVal) {
                    var parsed = moment().subtract(newVal.text, newVal.level);
                    if (parsed && parsed.isValid()) {
                        this.inTheLastInput.parsed[0] = parsed.toDate();
                        this.handleUserInputUpdate();
                    }
                }
            }
        },
        methods: {
            handleRangePick: function(val) {
                var defaultTime = this.defaultTime || [];
                var minDate = ELEMENT.DateUtil.modifyWithTimeString(val.minDate, defaultTime[0]);
                var maxDate = ELEMENT.DateUtil.modifyWithTimeString(val.maxDate, defaultTime[1]);

                if (this.maxDate === maxDate && this.minDate === minDate) {
                    return;
                }
                this.onPick && this.onPick(val);
                this.maxDate = maxDate;
                this.minDate = minDate;
                setTimeout(function() {
                    this.maxDate = maxDate;
                    this.minDate = minDate;
                }, 10);
            },
            handleChangeRange: function(val) {
                this.minDate = val.minDate;
                this.maxDate = val.maxDate;
                this.rangeState = val.rangeState;
                this.rangeMode = "inBetween";
            },
            handleShortcutClick: function(value) {
                this.selectedShortcut = value;
            },
            handleUserInputUpdate: function() {
                var inputObj = null;

                switch (this.rangeMode) {
                case 'inBetween':
                    inputObj = this.inBetweenInput.parsed;
                    break;
                case 'since':
                    inputObj = this.sinceInput.parsed;
                    break;
                case 'inTheLast':
                    inputObj = this.inTheLastInput.parsed;
                    break;
                default:
                    return;
                }

                if (inputObj && inputObj[0] && inputObj[1] && inputObj[0] < inputObj[1]) {
                    this.minDate = inputObj[0];
                    this.maxDate = inputObj[1];
                }
            },
            doDiscard: function() {

            },
            doCommit: function() {

            }
        }
    }));


}(window.countlyVue = window.countlyVue || {}));
