# Day-96 trip and food trace

All differences below are enabled minus disabled. Walking uses waking time at ages 12+. Hunger uses waking time at all ages. Each run reproduced its original world hash and exact walking, hunger and waking tick totals.

## aspen

### Walking ticks by activity

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| attend | 43793 | 55396 | 0.474 |
| eat_store | 26452 | 34852 | 0.343 |
| deposit | 164947 | 172889 | 0.328 |
| gather | 232782 | 226371 | -0.254 |
| operate | 40304 | 45013 | 0.193 |
| socialize | 57944 | 53519 | -0.179 |
| tend | 13003 | 8848 | -0.169 |
| rest | 20056 | 16945 | -0.126 |
| haul | 13354 | 10355 | -0.122 |
| repair | 25048 | 22042 | -0.122 |
| visit | 9520 | 12436 | 0.119 |
| explore | 34219 | 31332 | -0.117 |
| harvest | 58016 | 60542 | 0.105 |
| relocate | 0 | 2369 | 0.097 |
| wander | 21798 | 19614 | -0.088 |
| build | 6687 | 4597 | -0.085 |
| plan_site | 4526 | 6450 | 0.079 |
| fuel_fire | 27686 | 25749 | -0.078 |
| till | 5933 | 4294 | -0.067 |
| alone | 2284 | 1067 | -0.050 |
| give | 56777 | 55600 | -0.046 |
| host_meal | 361 | 1176 | 0.033 |
| craft | 2959 | 3739 | 0.032 |
| attend_meal | 567 | 1240 | 0.027 |
| flee | 7426 | 6886 | -0.022 |
| tree_work | 1651 | 1124 | -0.021 |
| sleep | 168365 | 167738 | -0.021 |
| withdraw | 170365 | 169768 | -0.019 |
| plant | 17069 | 16607 | -0.018 |
| fetch_water | 32041 | 31656 | -0.015 |
| butcher | 0 | 228 | 0.009 |
| drink | 116377 | 116179 | -0.005 |
| hunt | 224 | 134 | -0.004 |
| warm | 14033 | 14063 | 0.002 |
| defend | 288 | 280 | -0.000 |
| eat | 21 | 23 | 0.000 |
| tool_work | 3 | 2 | -0.000 |

### Walking ticks by destination and load, largest absolute changes

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| attend / point /  | 43793 | 55396 | 0.474 |
| withdraw / bakery / water | 29927 | 18339 | -0.471 |
| withdraw / smithy / charcoal | 10596 | 21318 | 0.437 |
| deposit / granary / grain | 63098 | 54361 | -0.354 |
| gather / source /  | 208793 | 202197 | -0.263 |
| sleep / lean_to /  | 38495 | 44393 | 0.241 |
| eat_store / granary /  | 11358 | 16549 | 0.212 |
| operate / bakery /  | 23213 | 28384 | 0.211 |
| deposit / granary / bread+grain | 4120 | 8821 | 0.192 |
| socialize / person /  | 57944 | 53519 | -0.179 |
| withdraw / food_rack / dried_fish | 14022 | 9675 | -0.177 |
| withdraw / bakery / flour | 20128 | 15844 | -0.174 |
| tend / plot /  | 13003 | 8848 | -0.169 |
| sleep / fire /  | 26558 | 22629 | -0.159 |
| withdraw / smithy / ore | 12624 | 16294 | 0.150 |
| eat_store / food_rack /  | 5765 | 9224 | 0.141 |

### Walking spells by activity

| Measure | Off | On | Change (count) |
|---|---:|---:|---:|
| withdraw | 2837 | 2697 | -140 |
| deposit | 2703 | 2836 | 133 |
| gather | 3673 | 3551 | -122 |
| operate | 661 | 763 | 102 |
| socialize | 1918 | 1840 | -78 |
| attend | 367 | 445 | 78 |
| eat_store | 413 | 481 | 68 |
| tend | 292 | 224 | -68 |
| sleep | 1590 | 1533 | -57 |
| build | 113 | 61 | -52 |
| haul | 159 | 120 | -39 |
| wander | 303 | 271 | -32 |

### Hunger and food availability

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| emptyHome / stockedPack / fed | 1157299 | 1095960 | -1.923 |
| stockedHome / stockedPack / fed | 266970 | 320500 | 1.607 |
| emptyHome / emptyPack / hungry | 347359 | 378777 | 0.933 |
| emptyHome / stockedPack / hungry | 808774 | 780564 | -0.900 |
| stockedHome / emptyPack / fed | 89100 | 98924 | 0.293 |
| emptyHome / emptyPack / fed | 334311 | 337149 | 0.067 |
| stockedHome / stockedPack / hungry | 232027 | 231092 | -0.041 |
| stockedHome / emptyPack / hungry | 58423 | 57352 | -0.036 |

### Contribution of each day to hungry time

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| 99 | 11178 | 19709 | 0.258 |
| 108 | 22687 | 31114 | 0.254 |
| 106 | 51830 | 45147 | -0.205 |
| 105 | 27882 | 33555 | 0.170 |
| 100 | 7149 | 12730 | 0.169 |
| 104 | 23920 | 28938 | 0.151 |
| 98 | 17364 | 19754 | 0.071 |
| 102 | 19910 | 21782 | 0.056 |
| 96 | 53738 | 55510 | 0.051 |
| 103 | 30369 | 29075 | -0.041 |
| 107 | 42339 | 41612 | -0.024 |
| 101 | 13677 | 14122 | 0.013 |
| 97 | 25316 | 25729 | 0.011 |

### Contribution of each age band

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| under7 | 114966 | 136535 | 0.647 |
| 12+ | 217003 | 228667 | 0.341 |
| 7-11 | 15390 | 13575 | -0.056 |

### Activities during hungry time

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| rest / work | 81936 | 93921 | 0.359 |
| eat_store / travel | 23397 | 33297 | 0.299 |
| gather / travel | 35580 | 32532 | -0.094 |
| withdraw / travel | 10412 | 12575 | 0.065 |
| attend / travel | 4512 | 6375 | 0.056 |
| relocate / travel | 0 | 1717 | 0.052 |
| sleep / travel | 18065 | 16469 | -0.049 |
| drink / travel | 18715 | 19928 | 0.036 |
| attend / work | 7005 | 8181 | 0.035 |
| craft / travel | 268 | 1263 | 0.030 |
| rest / travel | 4540 | 3670 | -0.027 |
| deposit / work | 596 | 1450 | 0.026 |
| converse / work | 46028 | 46954 | 0.025 |
| gather / work | 14009 | 13206 | -0.025 |
| withdraw / work | 1050 | 1874 | 0.025 |
| socialize / travel | 16951 | 17793 | 0.025 |

### Household contributions to hungry time

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| 1091 / short | 14673 | 35626 | 0.634 |
| 205689 / short | 0 | 17443 | 0.529 |
| 153331 / short | 18198 | 5541 | -0.385 |
| 196708 / short | 0 | 11191 | 0.339 |
| 213480 / short | 8805 | 0 | -0.267 |
| 148369 / short | 2488 | 11050 | 0.259 |
| 217775 / short | 7238 | 0 | -0.220 |
| 217974 / short | 0 | 6302 | 0.191 |
| 1086 / short | 4752 | 10743 | 0.181 |
| 213606 / short | 0 | 5745 | 0.174 |
| 44198 / short | 15799 | 10781 | -0.153 |
| 167255 / short | 11405 | 16466 | 0.153 |
| 223174 / short | 0 | 4711 | 0.143 |
| 205526 / short | 4640 | 0 | -0.141 |
| 196771 / short | 4636 | 0 | -0.141 |
| 136669 / short | 8160 | 3763 | -0.134 |

### Edible units transferred, largest changes

| Measure | Off | On | Change (count) |
|---|---:|---:|---:|
| deposit / grain / person / building | 1235 | 1409 | 174 |
| withdraw / grain / building / person | 204 | 323 | 119 |
| gather / berries / source / person | 1797 | 1702 | -95 |
| withdraw / bread / building / person | 336 | 427 | 91 |
| deposit / bread / person / building | 182 | 228 | 46 |
| gather / fruit / source / person | 729 | 687 | -42 |
| gather / grain / source / person | 923 | 959 | 36 |
| gather / fish / source / person | 649 | 622 | -27 |
| eat from store / fish / building / person | 117 | 92 | -25 |
| eat from store / fruit / building / person | 122 | 99 | -23 |
| deposit / fruit / person / building | 221 | 200 | -21 |
| given / fruit / person / person | 75 | 57 | -18 |
| eat from store / berries / building / person | 229 | 214 | -15 |
| given / bread / person / person | 7 | 22 | 15 |
| deposit / berries / person / building | 509 | 498 | -11 |
| offered gift / fish / person / person | 11 | 0 | -11 |
| given / berries / person / person | 256 | 266 | 10 |
| market / grain / person / person | 6 | 15 | 9 |
| harvest / grain / plot / person | 1778 | 1771 | -7 |
| eat from store / bread / building / person | 9 | 15 | 6 |
| given / fish / person / person | 36 | 40 | 4 |
| offered gift / fruit / person / person | 8 | 4 | -4 |
| gift on request / grain / person / person | 7 | 3 | -4 |
| set out for a shared meal / grain / person / meal | 7 | 3 | -4 |
| looked after / grain / person / person | 2 | 6 | 4 |

### Meal and gather activity endings

| Measure | Off | On | Change (count) |
|---|---:|---:|---:|
| gather / success /  | 2036 | 1981 | -55 |
| eat_store / failed /  | 206 | 258 | 52 |
| eat_store / interrupted /  | 46 | 84 | 38 |
| eat / success /  | 2098 | 2063 | -35 |
| gather / failed /  | 389 | 364 | -25 |
| eat_store / success /  | 387 | 367 | -20 |
| gather / partial /  | 459 | 478 | 19 |
| gather / interrupted /  | 963 | 953 | -10 |
| eat / interrupted /  | 22 | 12 | -10 |
| attend_meal / failed /  | 15 | 23 | 8 |
| attend_meal / success /  | 2 | 2 | 0 |

## gen-4

### Walking ticks by activity

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| withdraw | 131749 | 153641 | 0.918 |
| gather | 320084 | 307745 | -0.438 |
| sleep | 159522 | 169456 | 0.436 |
| socialize | 49688 | 57499 | 0.328 |
| fetch_water | 27804 | 35163 | 0.305 |
| wander | 26305 | 20043 | -0.250 |
| deposit | 122002 | 126481 | 0.207 |
| operate | 66421 | 62793 | -0.134 |
| attend | 65093 | 61935 | -0.116 |
| butcher | 3132 | 491 | -0.107 |
| drink | 95829 | 93052 | -0.094 |
| flee | 3563 | 5376 | 0.075 |
| craft | 5300 | 6740 | 0.060 |
| rest | 24942 | 23394 | -0.058 |
| tend | 13331 | 14635 | 0.056 |
| relocate | 1370 | 0 | -0.056 |
| plan_site | 3420 | 4651 | 0.051 |
| tree_work | 1862 | 682 | -0.048 |
| gear_work | 6693 | 7723 | 0.043 |
| fuel_fire | 17688 | 18593 | 0.040 |
| hunt | 1485 | 518 | -0.039 |
| alone | 1489 | 537 | -0.038 |
| explore | 35441 | 36194 | 0.038 |
| plant | 12824 | 11846 | -0.037 |
| haul | 9260 | 8317 | -0.037 |
| repair | 27131 | 26268 | -0.030 |
| warm | 13235 | 12595 | -0.023 |
| eat_store | 32576 | 31972 | -0.018 |
| hang_skin | 587 | 185 | -0.016 |
| harvest | 62294 | 62376 | 0.016 |
| host_meal | 581 | 228 | -0.014 |
| build | 3213 | 2871 | -0.013 |
| visit | 10772 | 11037 | 0.013 |
| give | 43220 | 42779 | -0.009 |
| till | 1082 | 1157 | 0.003 |
| defend | 163 | 88 | -0.003 |
| attend_meal | 339 | 299 | -0.002 |
| tool_work | 2 | 0 | -0.000 |
| eat | 19 | 19 | 0.000 |

### Walking ticks by destination and load, largest absolute changes

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| gather / source /  | 301496 | 287464 | -0.511 |
| socialize / person /  | 49688 | 57499 | 0.328 |
| sleep / fire /  | 21623 | 29466 | 0.324 |
| fetch_water / well /  | 27179 | 34173 | 0.290 |
| withdraw / food_rack / dried_fish | 13680 | 20613 | 0.285 |
| sleep / lean_to /  | 47185 | 40499 | -0.263 |
| wander / point /  | 26305 | 20043 | -0.250 |
| withdraw / bakery / water | 4794 | 10698 | 0.241 |
| sleep / hut /  | 75909 | 81127 | 0.228 |
| sleep / house /  | 14791 | 18364 | 0.148 |
| deposit / cellar / berries | 7691 | 11172 | 0.143 |
| deposit / bakery / water | 8501 | 11922 | 0.141 |
| deposit / kiln / clay | 1937 | 5389 | 0.141 |
| deposit / granary / grain | 15562 | 18927 | 0.140 |
| withdraw / smithy / iron | 4237 | 7557 | 0.136 |
| withdraw / bakery / bread | 42574 | 39238 | -0.127 |

### Walking spells by activity

| Measure | Off | On | Change (count) |
|---|---:|---:|---:|
| socialize | 1712 | 1923 | 211 |
| withdraw | 2124 | 2265 | 141 |
| deposit | 1786 | 1924 | 138 |
| fetch_water | 570 | 704 | 134 |
| wander | 352 | 283 | -69 |
| gather | 4519 | 4468 | -51 |
| sleep | 1432 | 1477 | 45 |
| harvest | 1047 | 1003 | -44 |
| warm | 290 | 249 | -41 |
| attend | 610 | 570 | -40 |
| tree_work | 67 | 28 | -39 |
| repair | 362 | 324 | -38 |

## river

### Walking ticks by activity

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| gather | 396168 | 414218 | 0.692 |
| attend | 55185 | 45389 | -0.401 |
| warm | 30944 | 40325 | 0.376 |
| relocate | 2503 | 10362 | 0.317 |
| withdraw | 93183 | 86291 | -0.287 |
| harvest | 40871 | 34869 | -0.246 |
| drink | 119822 | 114070 | -0.244 |
| give | 53887 | 48044 | -0.241 |
| fetch_water | 11238 | 17142 | 0.238 |
| socialize | 54777 | 60506 | 0.226 |
| fuel_fire | 23218 | 18454 | -0.195 |
| rest | 40718 | 45188 | 0.177 |
| flee | 4036 | 7882 | 0.155 |
| sleep | 152675 | 156618 | 0.145 |
| haul | 5921 | 9390 | 0.140 |
| build | 5094 | 2361 | -0.111 |
| craft | 7226 | 4925 | -0.094 |
| deposit | 76748 | 79123 | 0.089 |
| eat_store | 43086 | 41301 | -0.076 |
| tend | 6373 | 7479 | 0.044 |
| operate | 32429 | 31482 | -0.041 |
| repair | 23619 | 22801 | -0.035 |
| explore | 28718 | 27965 | -0.033 |
| butcher | 840 | 293 | -0.022 |
| visit | 6232 | 6756 | 0.021 |
| tree_work | 1346 | 959 | -0.016 |
| plant | 9721 | 10119 | 0.015 |
| plan_site | 7730 | 7413 | -0.014 |
| hunt | 1110 | 851 | -0.011 |
| alone | 517 | 765 | 0.010 |
| wander | 11697 | 11499 | -0.009 |
| gear_work | 2723 | 2900 | 0.007 |
| attend_meal | 699 | 544 | -0.006 |
| host_meal | 571 | 452 | -0.005 |
| defend | 497 | 475 | -0.001 |
| hang_skin | 102 | 117 | 0.001 |
| eat | 16 | 20 | 0.000 |

### Walking ticks by destination and load, largest absolute changes

| Measure | Off | On | Change (percentage points) |
|---|---:|---:|---:|
| gather / source /  | 382787 | 401691 | 0.728 |
| attend / point /  | 55185 | 45389 | -0.401 |
| warm / fire /  | 30944 | 40325 | 0.376 |
| relocate / point /  | 2503 | 10362 | 0.317 |
| withdraw / smithy / charcoal | 15898 | 9380 | -0.265 |
| sleep / hut /  | 72317 | 78915 | 0.260 |
| drink / well /  | 115114 | 109244 | -0.248 |
| harvest / plot /  | 40871 | 34869 | -0.246 |
| fetch_water / well /  | 9987 | 15766 | 0.233 |
| socialize / person /  | 54777 | 60506 | 0.226 |
| fuel_fire / fire /  | 18708 | 14221 | -0.183 |
| give / person / berries | 24738 | 21484 | -0.134 |
| sleep / lean_to /  | 39688 | 36519 | -0.132 |
| eat_store / granary /  | 24129 | 27101 | 0.118 |
| withdraw / food_rack / dried_fish | 5626 | 3134 | -0.101 |
| build / site /  | 4460 | 1996 | -0.100 |

### Walking spells by activity

| Measure | Off | On | Change (count) |
|---|---:|---:|---:|
| withdraw | 1457 | 1201 | -256 |
| gather | 5221 | 5444 | 223 |
| fetch_water | 196 | 303 | 107 |
| socialize | 1894 | 1988 | 94 |
| give | 916 | 826 | -90 |
| flee | 109 | 194 | 85 |
| attend | 470 | 385 | -85 |
| warm | 448 | 533 | 85 |
| deposit | 1108 | 1186 | 78 |
| harvest | 765 | 695 | -70 |
| relocate | 24 | 89 | 65 |
| drink | 1961 | 1907 | -54 |
