#!/usr/bin/perl
#
# perl merge.pl scrumPoker
#

use strict;
use warnings;
use POSIX qw(strftime);

my $appName = $ARGV[0];
my $outName = "$appName.xml";

open(OUT, ">", $outName) or die("Could not write to file.");

sub readFile{
	my $name = $_[0];
	print "IN: $name\n";

	local(*F);
	open(F, $name) or die("Could not open file: $name");

	while( my $line = <F>)  {   
		if( $line =~ /^\s*(<!--|\/\*)*\s*###([\w\.\d!-]+)###\s*(-->|\*\/)*\s*$/ ) {
			if( $1 =~ "!date" ) {
				print OUT strftime("%x %r\n", localtime());
			} else {
				readFile("$appName/$2");
			}
		} else {
	    	print OUT $line;
	    }    
	}
	close(F);
}

readFile("$appName/app.xml");
close(OUT);
print "OUT: $outName\n";