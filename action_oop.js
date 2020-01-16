/**
 @module MapOfCasualties
 */
class Visualization {
    /** constructor */
    constructor () {
        d3.queue()
            .defer(d3.json, 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson') // World shape
            .defer(d3.csv, 'https://raw.githubusercontent.com/L28-1-n-1-n/L28-1-n-1-n.github.io/master/globalterrorismdb_0718dist_reduced_version2.csv')
            .await(this.ready);
    }

    /**
     * Generate the viewport and visualization.
     * @ready
     * @property {Object} svg - The svg element that defines the viewport.
     * @property {Number} currentYear - The year on display.
     * @property {Number} width - Width of the canvas.
     * @property {Number} height - Height of the canvas.
     * @property {Object} projection - The background map according to the scale applied
     * @property {Array} allAttackType - An array composed by all unique values for attack types, represented by numbers in attacktype1
     * @property {Array} color - An array of colours each representing an attack type. This is a scale for the colour
     * @property {Numbers} valueExtent - The maximum and minimum value of casualties serves as a scale for the bubble size
     * @property {Number} size - Stores the size of the bubble in pixel to be generated
     */
    ready (error, dataGeo, data) {
        if (error) throw error;
            const svg = d3.select('svg');
            var currentYear = 1970;
            var width = 1945;
            var height = 1500;
            var projection = d3.geoMercator()
                .center([160, -75]) /** GPS of location to zoom on */
                .scale(150) /** This is like the zoom */
                .translate([width / 2, height / 2]);

            /**  Iterates through the data and compose an array of all unique values for attack types, represented by numbers in attacktype1 */
            var allAttackType = d3.map(data, function (d) {
                return (d.attacktype1);
            }).keys();

            /** The array of unique attack types shall each be represented by a colour, i.e. they serve as a scale for the colour */

            var color = d3.scaleOrdinal()
                .domain(allAttackType)
                .range(d3.schemePaired);

            /** Add a scale for bubble size */
            var valueExtent = d3.extent(data, function (d) {
                return +d.nkill;
            });

            var size = d3.scaleSqrt()
                .domain(valueExtent) /** * What's in the data */
                .range([1, 100]); /** * Size in pixel */

            /** Draw the map */
            svg.append('g')
                .selectAll('path')
                .data(dataGeo.features)
                .enter()
                .append('path')
                .attr('fill', '#b8b8b8')
                .attr('d', d3.geoPath()
                    .projection(projection)
                )
                .style('stroke', 'none')
                .style('opacity', 0.3);

            // Add circles:
            svg
                .selectAll('myCircles')
                .data(data.sort(function (a, b) {
                    return +b.nkill - +a.nkill;
                }).filter(function (d) {
                    return d.iyear == currentYear; // draw only circles that correspond to activities of the current year
                }))
                .enter()
                .append('circle')
                .attr('cx', function (d) {
                    return projection([+d.longitude, +d.latitude])[0];
                })
                .attr('cy', function (d) {
                    return projection([+d.longitude, +d.latitude])[1];
                })
                // size of the circle is determined by the casualty of the attack
                .attr('r', function (d) {
                    return size(+d.nkill);
                })
                // colour of the circle correspond to the type of the attack
                .style('fill', function (d) {
                    return color(d.attacktype1);
                })
                // highlight attacks with casualties greater than 2000, those are significant attacks
                .attr('stroke', function (d) {
                    if (d.nkill > 200) {
                        return 'black';
                    } else {
                        return 'none';
                    }
                })
                .attr('stroke-width', 2)
                .attr('fill-opacity', 0.4);

            // Add title and explanation
            svg
                .append('text')
                .attr('text-anchor', 'end')
                .style('fill', 'black')
                .attr('x', width - 700)
                .attr('y', height - 900)
                .attr('width', 90)
                .html('GLOBAL TERRORISM CASUALTIES BY YEAR')
                .style('font-size', 32)
                .style('font-family', 'arial');

            svg
                .append('text')
                .attr('text-anchor', 'end')
                .style('fill', 'black')
                .attr('x', width - 700)
                .attr('y', height - 850)
                .attr('width', 90)
                .html('Use Left and Right Arrows to Navigate')
                .style('font-size', 24)
                .style('font-family', 'arial');

            svg
                .append('a')
                .attr('xlink:href', 'https://l28-1-n-1-n.github.io/out/index.html')
                .append('text')
                .attr('text-anchor', 'end')
                .style('fill', 'black')
                .attr('x', width - 700)
                .attr('y', height - 800)
                .attr('width', 90)
                .html('Documentation')
                .style('font-size', 28)
                .style('font-family', 'arial');

            // Add current year
            svg
                .append('text')
                .attr('text-anchor', 'start')
                .style('fill', 'black')
                .attr('x', 20)
                .attr('y', 50)
                .attr('width', 90)
                .attr('id', 'year_now')
                .html(currentYear)
                .style('font-size', 40)
                .style('font-family', 'arial');

            window.focus();

            // create legends including the size scale, and the colour keys
            drawLegends();

            // listens to input from the keyboard: increment current year if Right Arrow is pressed, decrement if Left Arrow is pressed.

            d3.select(window).on('keydown', function () {
                switch (d3.event.keyCode) {
                    case 37: // left arrow key
                        currentYear = currentYear - 1;
                        break;
                    case 39: // right arrow key
                        currentYear = currentYear + 1;
                        break;
                }
                // refresh visualization to show the most updated year
                update();
                drawLegends();
            });

            /**
             * Update the visualization to reflect the appropriate year.
             * @method update
             * @property {Object} circle - The updated bubbles generated from the new data.
             *
             */
            function update () {
                // Further incrementation / decrementation beyond the limit of the dataset (1970 - 2017) not possible
                if (currentYear < 1970) {
                    currentYear = 1970;
                }
                if (currentYear > 2017) {
                    currentYear = 2017;
                }
                // removing all outdated visualizations
                d3.select('year_now').remove();
                d3.selectAll('circle').remove();

                // create the new circles according to the new data for the updated year
                var circle = svg.select('g').selectAll('myCircles')
                    .data(data.sort(function (a, b) {
                        return +b.nkill - +a.nkill;
                    }).filter(function (d) {
                        return d.iyear == currentYear;
                    }));

                circle.enter().append('circle')
                    .attr('cx', function (d) {
                        return projection([+d.longitude, +d.latitude])[0];
                    })
                    .attr('cy', function (d) {
                        return projection([+d.longitude, +d.latitude])[1];
                    })
                    .attr('r', function (d) {
                        return size(+d.nkill);
                    })
                    .style('fill', function (d) {
                        return color(d.attacktype1);
                    })
                    .attr('stroke', function (d) {
                        if (d.nkill > 200) {
                            return 'black';
                        } else {
                            return 'none';
                        }
                    })
                    .attr('stroke-width', 1)
                    .attr('fill-opacity', 0.4);

                // removes the label for the outdated year
                d3.selectAll('#year_now').remove();

                // re-write legend to indicate the updated year
                svg

                    .append('text')
                    .attr('text-anchor', 'start')
                    .style('fill', 'black')
                    .attr('x', 20)
                    .attr('y', 50)
                    .attr('width', 90)
                    .attr('id', 'year_now')
                    .html(currentYear)
                    .style('font-size', 40)
                    .style('font-family', 'arial');
            }

            /**
             * Generate legends - key to scale and types of attack.
             * @method drawLegends
             * @property {Object} valuesToShow - A few chosen values for the scale.
             * @property {Number} xCircle - x-Coordinate of centre of circle
             * @property {Number} xLabel - x-Coordinate of where the label begins
             * @property {Array} rectData - data to draw rectangular key for different types of attack
             * @property {Object} rect - Rectangular shapes on top right corner as key showing colour codes for different types of attact
             *
             */
            function drawLegends () {
                // --------------- //
                // ADD LEGEND //
                // --------------- //

                // Add legend: circles
                var valuesToShow = [100, 500, 1000, 2000];
                var xCircle = width - 1800;
                var xLabel = width / 3 + 100;
                svg
                    .selectAll('legend')
                    .data(valuesToShow)
                    .enter()
                    .append('circle')
                    .attr('cx', xCircle)
                    .attr('cy', function (d) {
                        return height - 800 - size(d);
                    })
                    .attr('r', function (d) {
                        return size(d);
                    })
                    .style('fill', 'none')
                    .attr('stroke', 'black');

                // Add legend: line segments
                svg
                    .selectAll('legend')
                    .data(valuesToShow)
                    .enter()
                    .append('line')
                    .attr('x1', function (d) {
                        return xCircle + size(d);
                    })
                    .attr('x2', xLabel - 400)
                    .attr('y1', function (d) {
                        return height - 800 - size(d);
                    })
                    .attr('y2', function (d) {
                        return height - 800 - size(d);
                    })
                    .attr('stroke', 'black')
                    .style('stroke-dasharray', ('2,2'));

                // Add legend: labels
                svg
                    .selectAll('legend')
                    .data(valuesToShow)
                    .enter()
                    .append('text')
                    .attr('x', xLabel - 400)
                    .attr('y', function (d) {
                        return height - 800 - size(d);
                    })
                    .text(function (d) {
                        return d;
                    })
                    .style('font-size', 20)
                    .attr('alignment-baseline', 'middle');

                // Add legned: colour key for types of attack

                var rectData = [
                    { y: 30, colour: 1, attack_type: 'Assisination', id: 'Assisination' },
                    { y: 60, colour: 6, attack_type: 'Hostage Taking (Kidnapping)', id: 'Kidnapping' },
                    { y: 90, colour: 3, attack_type: 'Bombing/Explosion', id: 'BE' },
                    { y: 120, colour: 7, attack_type: 'Facility/Infrastructure Attack', id: 'FIA' },
                    { y: 150, colour: 2, attack_type: 'Armed Assault', id: 'Armed' },
                    { y: 180, colour: 4, attack_type: 'Hijacking', id: 'Hijacking' },
                    { y: 210, colour: 9, attack_type: 'Insurgency/Guerilla Action', id: 'IGA' },
                    { y: 240, colour: 8, attack_type: 'Unarmed Assault', id: 'UA' },
                    { y: 270, colour: 5, attack_type: 'Hostage Taking (Barricade Incident)', id: 'HT' }

                ];

                // var rect = svg.selectAll('rect')
                svg.selectAll('rect')
                    .data(rectData)
                    .enter()
                    .append('rect')
                    .attr('x', 1200)
                    .attr('y', function (d) {
                        return d.y;
                    })
                    .attr('width', 10)
                    .style('height', 30)
                    .style('fill', function (d) {
                        return color(d.colour);
                    })
                    .attr('fill-opacity', 0.4)

                    // when the mouse hover over the colour key, show the text key to indicate the type of attack indicated by the colour
                    .on('mouseover', function (d, i) {
                        svg.append('text')
                            .attr('text-anchor', 'end')
                            .style('fill', 'black')
                            .attr('x', 1170)
                            .attr('y', d.y + 15)
                            .attr('id', d.id)
                            .text(function () {
                                return (d.attack_type); // Value of the text
                            })
                            .style('font-size', 18);
                        d3.select(this).attr('fill-opacity', 1);
                    })

                    // when the mouse is no longer hovering above the colour key, the text key showing the type of attack disappears
                    .on('mouseout', function (d, i) {
                        d3.select(this).attr(
                            'fill-opacity', 0.4
                        );

                        // Select text by id and then remove
                        d3.select('#' + d.id).remove(); // Remove text location
                    });
            }
    }
}

const visual = new Visualization();
visual.ready();
