use <MCAD/bitmap/bitmap.scad>
include <MCAD/polyholes.scad>

strut_width = 2;
strut_height = strut_width/1.5;
bore_dia = 1.2;
bore_wall_thickness_ratio = 2.5;
print_spacing =  (bore_dia * bore_wall_thickness_ratio) + 0.5;

use_polyhole = true; // should be true when printing with FDM, false with DLP
show_letter = false;

letter_height = strut_width / 4;
letter_size = strut_width / 8;

j_reference_length = 15;

// Using the "Theo Jansen Linkage 11 holy numbers" together with the top j strut as a reference point use the ratio to determine lengths
// See: http://www.strandbeest.com/beests_leg.php and http://www.instructables.com/community/theo-jansen-mechanism-1/
index=0;
name=1;
count=2;
length=3;
rods = [
	[0, "A", 1, (38.0 / 50) * j_reference_length], // horizontal body linkage - part of body()
	[1, "B", 1, (41.5 / 50) * j_reference_length],
	[2, "C", 1, (39.3 / 50) * j_reference_length],
	[3, "D", 1, (40.1 / 50) * j_reference_length],
	[4, "E", 1, (55.8 / 50) * j_reference_length],
	[5, "F", 1, (39.4 / 50) * j_reference_length],
	[6, "G", 1, (36.7 / 50) * j_reference_length],
	[7, "H", 1, (65.7 / 50) * j_reference_length],
	[8, "I", 1, (49.0 / 50) * j_reference_length],
	[9, "J", 1, (50.0 / 50) * j_reference_length],
	[10, "K", 2, (61.9 / 50) * j_reference_length],
	[11, "L", 1, ( 7.8 / 50) * j_reference_length], // vertical body offset - part of body()
	[12, "M", 1, (15.0 / 50) * j_reference_length] // crank - not printed, use wire etc.
];

a = rods[0];
b = rods[1];
c = rods[2];
d = rods[3];
e = rods[4];
f = rods[5];
g = rods[6];
h = rods[7];
i = rods[8];
j = rods[9];
k = rods[10];
l = rods[11];
m = rods[12];


echo("a=", a[length]);
echo("b=", b[length]);
echo("c=", c[length]);
echo("d=", d[length]);
echo("e=", e[length]);
echo("f=", f[length]);
echo("g=", g[length]);
echo("h=", h[length]);
echo("i=", i[length]);
echo("j=", j[length]);
echo("k=", k[length]);
echo("l=", l[length]);
echo("m=", m[length]);

assembly();

//body();
//leg_print();
//leg_print_pair();
//leg_assembly();
//knee();
//foot();


module assembly() {
	
	translate([0, d[length], strut_height*4])
		body_part();

	translate([0, d[length], -strut_height*4])
		body_part();

	translate([-l[length], d[length] + a[length], -strut_height*2]) 
	rotate([0, 0, 90]) 
		crank();
	
	leg_assembly();
	
	translate([0, d[length]*2 + a[length]*2, strut_height])
	rotate([180, 0, 0]) 
		leg_assembly();
}

module body() {
	body_part();
	rotate([0, 0, 180])
	translate([l[length] + print_spacing, -(a[length]*2 + print_spacing), 0]) 
		body_part();
	
}

module body_part() {
	linkage(a, "left");
	translate([0, a[length], 0]) 
		linkage(a, "right");

	translate([0, a[length], 0]) 
	rotate([0, 0, 90])
		linkage(l, "right");
}

module leg_print(){

	knee();

	translate([-print_spacing*1.5, 0, 0]) 
	rotate([0, 0, 48])
		foot();

	translate([print_spacing, 0, 0]) 
		linkage(f);

	translate([print_spacing*2, 0, 0]) 
		linkage(c);

	translate([print_spacing*3, 0, 0]) 
		linkage(j);

	translate([print_spacing*4, 0, 0]) 
		linkage(k);
	translate([print_spacing*5, 0, 0]) 
		linkage(k);

	translate([0, d[length] + print_spacing, 0]) 
	spacer();
}

module leg_print_pair() {
	leg_print();
	translate([0, k[length]+print_spacing, 0]) 
		leg_print();
}

module leg_assembly(){

	knee();

	translate([f[length], 0, 0]) 
	rotate([0, 0, -45])
	foot();

	translate([0, 0, -strut_height])
	rotate([0, 0, -90])
	linkage(f);

	translate([0, d[length], -strut_height])
	rotate([0, 0, -95])
	linkage(c);

	DB_angle = 86.3;
	d_adjacent_difference = cos(DB_angle)*b[length];
	translate([-b[length], d[length]-d_adjacent_difference, -strut_height]) 
	rotate([0, 0, -25])
		linkage(j);

	translate([c[length], d[length]-2.5, strut_height]) 
	rotate([0, 0, 52])
		linkage(k);

	translate([c[length], d[length]-2.5, -strut_height*2]) 
		spacer();

	translate([c[length], d[length]-2.5, -strut_height*3]) 
	rotate([0, 0, 52])
		linkage(k);
}

module crank() {
	rotate([0, 0, 0])
		linkage(m);
}

module knee() {
	linkage(d);
	rotate([0, 0, 47.9])
		linkage(e);
	translate([0, d[length], 0])
	rotate([0, 0, 180-86.3])
		linkage(b);
}

module foot(){
	linkage(h, "left");
	rotate([0, 0, 47])
		linkage(g);
	translate([0, h[length], 0])
	rotate([0, 0, 180-33])
		linkage(i, "right");

	translate([0, h[length], 0])
		cylinder(r=bore_dia/2, h=strut_height, center=false, $fn=20);
}

module spacer() {
	difference(){
		cylinder(r=(bore_dia/2)*bore_wall_thickness_ratio, h=strut_height, center=false, $fn=30);	
		myhole(h=strut_height+2, d=bore_dia);
	}
}

module myhole(h,d) {
	if (use_polyhole){
		polyhole(h=h, d=d);
	} else {
		cylinder(r=d/2, h=h, center=false, $fn=20);
	}
}


// links = left,right,both,none
module linkage(rod, links="both"){
	difference() {
		union(){
			translate([-strut_width/2, 0, 0])
				cube(size = [strut_width,rod[length],strut_height], center=false);

			if (links == "left" || links == "both" ){
				cylinder(r=(bore_dia/2)*bore_wall_thickness_ratio, h=strut_height, center=false, $fn=30);
			}
			
			if (links == "right" || links == "both" ){
				translate([0, rod[length], 0])
					cylinder(r=(bore_dia/2)*bore_wall_thickness_ratio, h=strut_height, center=false, $fn=30);
			}
		}
		if (links == "left" || links == "both" ){
			translate([0, 0, -1]) 
				myhole(h=strut_height+2, d=bore_dia);
		}
		if (links == "right" || links == "both" ){
			translate([0, rod[length], -1])
				myhole(h=strut_height+2, d=bore_dia);
		}

		if (show_letter){
			translate([0, rod[length]/2, strut_height-letter_height])
				8bit_char(rod[name], letter_size, letter_height*2);
		}		
	}
}
