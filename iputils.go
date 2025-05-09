
package main

import (
	"fmt"
	"net"
)

// ipToUint32 converts an IP string to its uint32 representation.
func ipToUint32(ipStr string) (uint32, error) {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return 0, fmt.Errorf("invalid IP address: %s", ipStr)
	}
	ip = ip.To4()
	if ip == nil {
		return 0, fmt.Errorf("not an IPv4 address: %s", ipStr)
	}
	return uint32(ip[0])<<24 | uint32(ip[1])<<16 | uint32(ip[2])<<8 | uint32(ip[3]), nil
}

// uint32ToIP converts a uint32 IP representation back to a string.
func uint32ToIP(ipUint uint32) string {
	return fmt.Sprintf("%d.%d.%d.%d", byte(ipUint>>24), byte(ipUint>>16), byte(ipUint>>8), byte(ipUint))
}
